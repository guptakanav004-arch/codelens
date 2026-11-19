"""JavaScript / TypeScript static analysis via ESLint (only when it is installed locally or globally)."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from app.config import get_settings
from app.schemas.review import StaticFinding, ToolStatus
from app.utils.logging import get_logger

log = get_logger(__name__)

# Inline rule set: works with ESLint 9 using --no-config-lookup, no project config required.
_RULES = {
    "eqeqeq": "error", "no-var": "warn", "no-eval": "error", "no-implied-eval": "error", "no-new-func": "error",
    "no-unused-vars": "warn", "no-empty": "warn", "no-unreachable": "error", "no-dupe-keys": "error",
    "no-cond-assign": "error", "no-self-compare": "warn", "no-throw-literal": "warn", "prefer-const": "warn",
    "no-await-in-loop": "warn", "no-redeclare": "error", "no-const-assign": "error",
}
_ROOT = Path(__file__).resolve().parents[3]


def _find_eslint() -> list[str] | None:
    local = _ROOT / "node_modules" / ".bin" / "eslint"
    if local.exists():
        return [str(local)]
    exe = shutil.which("eslint")
    return [exe] if exe else None


def run_eslint(code: str, language: str) -> tuple[list[StaticFinding], ToolStatus]:
    if language == "typescript":
        return [], ToolStatus(tool="eslint", status="skipped", detail="TypeScript parsing needs @typescript-eslint/parser, which is not bundled.")
    cmd = _find_eslint()
    if not cmd:
        return [], ToolStatus(tool="eslint", status="unavailable", detail="ESLint is not installed (npm i -g eslint).")
    args = cmd + ["--no-config-lookup", "--stdin", "--stdin-filename", "snippet.js", "-f", "json"]
    for rule, level in _RULES.items():
        args += ["--rule", f"{rule}: {level}"]
    try:
        proc = subprocess.run(args, input=code, capture_output=True, text=True, timeout=get_settings().tool_timeout_seconds, check=False)
        if proc.returncode not in (0, 1):
            raise RuntimeError(proc.stderr[:200])
        data = json.loads(proc.stdout or "[]")
    except Exception as exc:  # noqa: BLE001
        log.warning("eslint failed: %s", exc)
        return [], ToolStatus(tool="eslint", status="failed", detail="ESLint failed to run; its findings are omitted.")

    findings: list[StaticFinding] = []
    for file_result in data:
        for m in file_result.get("messages", []):
            rule = m.get("ruleId") or "parse-error"
            fatal = bool(m.get("fatal"))
            findings.append(StaticFinding(
                tool="eslint", rule=rule, message=m.get("message", "ESLint finding"),
                severity="High" if fatal else ("Medium" if m.get("severity") == 2 else "Low"),
                category="Bug" if fatal or rule in ("no-dupe-keys", "no-unreachable", "no-const-assign", "no-cond-assign") else "Quality",
                line=m.get("line"),
            ))
    return findings, ToolStatus(tool="eslint", status="ok", findings=len(findings))
