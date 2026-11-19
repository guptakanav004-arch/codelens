"""Python static analysis: Ruff, Bandit, Radon and the standard-library AST.

Submitted code is only ever parsed or piped to analysis tools via stdin. It is never imported or executed.
"""
from __future__ import annotations

import ast
import json
import shutil
import subprocess
import sys
from typing import Optional

from app.config import get_settings
from app.schemas.review import FunctionMetric, StaticFinding, StaticMetrics, ToolStatus
from app.utils.logging import get_logger

log = get_logger(__name__)

_RUFF_SELECT = "E4,E7,E9,F,B"


def _run_tool(cmd: list[str], stdin: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=get_settings().tool_timeout_seconds,
        check=False,
    )


def _module_available(module: str) -> bool:
    try:
        __import__(module)
        return True
    except ImportError:
        return False


def _ruff_severity(code: str) -> tuple[str, str]:
    if code.startswith("E9") or code in ("F821", "F822", "F823", "F63", "F632", "F7") or code.startswith("F7"):
        return "High", "Bug"
    if code.startswith("F8") or code.startswith("B0"):
        return "Medium", "Bug"
    if code in ("F401", "F841", "F811"):
        return "Low", "Quality"
    return "Low", "Quality"


def run_ruff(code: str) -> tuple[list[StaticFinding], ToolStatus]:
    exe = shutil.which("ruff")
    cmd = [exe] if exe else ([sys.executable, "-m", "ruff"] if _module_available("ruff") else None)  # type: ignore[list-item]
    if not cmd:
        return [], ToolStatus(tool="ruff", status="unavailable", detail="Ruff is not installed (pip install ruff).")
    try:
        proc = _run_tool(
            cmd + ["check", "--isolated", "--no-cache", "--output-format", "json", "--select", _RUFF_SELECT,
                   "--stdin-filename", "snippet.py", "-"],
            code,
        )
        if proc.returncode not in (0, 1):
            raise RuntimeError(proc.stderr[:200])
        data = json.loads(proc.stdout or "[]")
    except Exception as exc:  # noqa: BLE001 - tool failure must never break the review
        log.warning("ruff failed: %s", exc)
        return [], ToolStatus(tool="ruff", status="failed", detail="Ruff failed to run; its findings are omitted.")
    findings = []
    for item in data:
        sev, cat = _ruff_severity(item.get("code") or "")
        findings.append(StaticFinding(
            tool="ruff", rule=item.get("code") or "ruff", message=item.get("message", "Ruff finding"),
            severity=sev, category=cat, line=(item.get("location") or {}).get("row"),  # type: ignore[arg-type]
        ))
    return findings, ToolStatus(tool="ruff", status="ok", findings=len(findings))


_BANDIT_SEV = {"HIGH": "High", "MEDIUM": "Medium", "LOW": "Low"}


def run_bandit(code: str) -> tuple[list[StaticFinding], ToolStatus]:
    exe = shutil.which("bandit")
    cmd = [exe] if exe else ([sys.executable, "-m", "bandit"] if _module_available("bandit") else None)  # type: ignore[list-item]
    if not cmd:
        return [], ToolStatus(tool="bandit", status="unavailable", detail="Bandit is not installed (pip install bandit).")
    try:
        proc = _run_tool(cmd + ["-f", "json", "-q", "-"], code)
        if proc.returncode not in (0, 1):
            raise RuntimeError(proc.stderr[:200])
        data = json.loads(proc.stdout or "{}")
    except Exception as exc:  # noqa: BLE001
        log.warning("bandit failed: %s", exc)
        return [], ToolStatus(tool="bandit", status="failed", detail="Bandit failed to run; its findings are omitted.")
    findings = []
    for r in data.get("results", []):
        findings.append(StaticFinding(
            tool="bandit", rule=f"{r.get('test_id')} {r.get('test_name', '')}".strip(),
            message=r.get("issue_text", "Bandit finding"),
            severity=_BANDIT_SEV.get(str(r.get("issue_severity")).upper(), "Low"),  # type: ignore[arg-type]
            category="Security", line=r.get("line_number"),
        ))
    return findings, ToolStatus(tool="bandit", status="ok", findings=len(findings))


def run_radon(code: str) -> tuple[Optional[dict], ToolStatus]:
    if not _module_available("radon"):
        return None, ToolStatus(tool="radon", status="unavailable", detail="Radon is not installed (pip install radon).")
    try:
        from radon.complexity import cc_rank, cc_visit
        from radon.metrics import mi_visit

        blocks = cc_visit(code)
        flat = []
        for b in blocks:
            if getattr(b, "methods", None):
                flat.extend(b.methods)
            elif not hasattr(b, "methods"):
                flat.append(b)
        funcs = [FunctionMetric(name=getattr(f, "fullname", f.name), line=f.lineno, complexity=f.complexity, rank=cc_rank(f.complexity)) for f in flat]
        funcs.sort(key=lambda f: -f.complexity)
        total = sum(f.complexity for f in funcs) if funcs else 1
        mi = round(float(mi_visit(code, multi=True)), 1)
        return {"functions": funcs[:15], "total": total, "mi": mi, "count": len(funcs)}, ToolStatus(
            tool="radon", status="ok", detail="Cyclomatic complexity and maintainability index measured by Radon", findings=0)
    except SyntaxError:
        return None, ToolStatus(tool="radon", status="skipped", detail="Skipped: the code has a syntax error.")
    except Exception as exc:  # noqa: BLE001
        log.warning("radon failed: %s", exc)
        return None, ToolStatus(tool="radon", status="failed", detail="Radon failed to run.")


_NESTING_NODES = (ast.If, ast.For, ast.While, ast.Try, ast.With, ast.AsyncFor, ast.AsyncWith)
_BRANCH_NODES = (ast.If, ast.For, ast.While, ast.ExceptHandler, ast.IfExp, ast.comprehension, ast.AsyncFor)


def _depth(node: ast.AST, current: int = 0) -> int:
    best = current
    for child in ast.iter_child_nodes(node):
        best = max(best, _depth(child, current + 1 if isinstance(child, _NESTING_NODES) else current))
    return best


def run_ast(code: str) -> tuple[list[StaticFinding], ToolStatus, Optional[dict]]:
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        f = StaticFinding(tool="python-ast", rule="syntax-error", message=f"Syntax error: {exc.msg}", severity="High", category="Bug", line=exc.lineno)
        return [f], ToolStatus(tool="python-ast", status="ok", detail="Code does not parse", findings=1), None
    except (ValueError, RecursionError, MemoryError):
        return [], ToolStatus(tool="python-ast", status="failed", detail="Code could not be parsed."), None

    findings: list[StaticFinding] = []
    func_count = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_count += 1
            for default in node.args.defaults + [d for d in node.args.kw_defaults if d is not None]:
                if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                    findings.append(StaticFinding(tool="python-ast", rule="mutable-default-arg", message=f"Function '{node.name}' uses a mutable default argument shared between calls.", severity="Medium", category="Bug", line=node.lineno))
            n_args = len(node.args.args) + len(node.args.kwonlyargs)
            if n_args > 6:
                findings.append(StaticFinding(tool="python-ast", rule="too-many-params", message=f"Function '{node.name}' takes {n_args} parameters; consider grouping them.", severity="Low", category="Maintainability", line=node.lineno))
            length = (getattr(node, "end_lineno", node.lineno) or node.lineno) - node.lineno + 1
            if length > 60:
                findings.append(StaticFinding(tool="python-ast", rule="long-function", message=f"Function '{node.name}' is {length} lines long; consider splitting it.", severity="Low", category="Maintainability", line=node.lineno))
            if _depth(node) > 4:
                findings.append(StaticFinding(tool="python-ast", rule="deep-nesting", message=f"Function '{node.name}' has deeply nested control flow.", severity="Low", category="Maintainability", line=node.lineno))
        elif isinstance(node, ast.ExceptHandler):
            if node.type is None:
                findings.append(StaticFinding(tool="python-ast", rule="bare-except", message="Bare 'except:' hides unexpected errors.", severity="Low", category="Quality", line=node.lineno))
            elif len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                findings.append(StaticFinding(tool="python-ast", rule="swallowed-exception", message="Exception is caught and silently ignored.", severity="Medium", category="Bug", line=node.lineno))
    branches = sum(isinstance(n, _BRANCH_NODES) for n in ast.walk(tree)) + sum(
        max(len(n.values) - 1, 0) for n in ast.walk(tree) if isinstance(n, ast.BoolOp))
    info = {"functions": func_count, "nesting": _depth(tree), "cyclomatic": branches + 1}
    return findings, ToolStatus(tool="python-ast", status="ok", detail="Structural analysis via Python ast", findings=len(findings)), info


def analyze_python(code: str) -> tuple[list[StaticFinding], list[ToolStatus], dict]:
    """Returns findings, tool statuses and extra metric info."""
    ast_findings, ast_status, ast_info = run_ast(code)
    ruff_findings, ruff_status = run_ruff(code)
    bandit_findings, bandit_status = run_bandit(code)
    radon_info, radon_status = run_radon(code)

    # Ruff reports syntax errors too; avoid duplicating the AST syntax finding
    if any(f.rule == "syntax-error" for f in ast_findings):
        ruff_findings = [f for f in ruff_findings if not (f.rule or "").startswith("E9")]
    # the AST analyzer already reports mutable defaults; drop Ruff's duplicate (B006)
    if any(f.rule == "mutable-default-arg" for f in ast_findings):
        ruff_findings = [f for f in ruff_findings if f.rule != "B006"]

    findings = ast_findings + ruff_findings + bandit_findings
    return findings, [ast_status, ruff_status, bandit_status, radon_status], {
        "ast": ast_info, "radon": radon_info}


def python_metrics(base: StaticMetrics, extra: dict) -> StaticMetrics:
    """Upgrade heuristic metrics with Radon (preferred) or AST measurements."""
    radon, ast_info = extra.get("radon"), extra.get("ast")
    if radon:
        return base.model_copy(update={
            "function_count": radon["count"], "cyclomatic_complexity": radon["total"], "source": "radon",
            "functions": radon["functions"], "maintainability_index": radon["mi"],
            "max_nesting_depth": ast_info["nesting"] if ast_info else base.max_nesting_depth,
        })
    if ast_info:
        return base.model_copy(update={
            "function_count": ast_info["functions"], "cyclomatic_complexity": ast_info["cyclomatic"],
            "max_nesting_depth": ast_info["nesting"], "source": "python-ast",
        })
    return base
