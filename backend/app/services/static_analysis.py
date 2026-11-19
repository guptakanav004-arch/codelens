"""Static-analysis orchestrator: chooses analyzers per language and tolerates missing tools."""
from __future__ import annotations

from app.analyzers.generic_analyzer import heuristic_metrics, pattern_scan
from app.analyzers.javascript_analyzer import run_eslint
from app.analyzers.python_analyzer import analyze_python, python_metrics
from app.schemas.review import StaticAnalysisResult, StaticFinding, ToolStatus
from app.utils.logging import get_logger

log = get_logger(__name__)


def run_static_analysis(code: str, language: str) -> StaticAnalysisResult:
    """Blocking; call from a worker thread. Never executes the submitted code."""
    findings: list[StaticFinding] = []
    tools: list[ToolStatus] = []
    metrics = heuristic_metrics(code, language)

    if language == "python":
        try:
            py_findings, py_tools, extra = analyze_python(code)
            findings += py_findings
            tools += py_tools
            metrics = python_metrics(metrics, extra)
        except Exception as exc:  # noqa: BLE001 - analyzer crash must not fail the review
            log.exception("python analyzer crashed: %s", exc)
            tools.append(ToolStatus(tool="python-analyzers", status="failed", detail="Python analyzers failed unexpectedly."))
        scan, scan_status = pattern_scan(code, language)
        # ruff / bandit / AST cover these; keep pattern findings only where tools did not report the same line+category
        known = {(f.line, f.category) for f in findings}
        scan = [f for f in scan if (f.line, f.category) not in known]
        findings += scan
        scan_status.findings = len(scan)
        tools.append(scan_status)
    elif language in ("javascript", "typescript"):
        es_findings, es_status = run_eslint(code, language)
        scan, scan_status = pattern_scan(code, language, include_js_fallback=es_status.status != "ok")
        findings += es_findings + scan
        tools += [es_status, scan_status]
    else:
        scan, scan_status = pattern_scan(code, language)
        findings += scan
        tools.append(scan_status)

    tools.append(ToolStatus(
        tool="metrics", status="ok",
        detail=f"Measured by {metrics.source}" if metrics.source != "heuristic" else "Heuristic line/nesting/branch counts (not a verified complexity measurement)",
    ))
    return StaticAnalysisResult(tools=tools, findings=findings, metrics=metrics)
