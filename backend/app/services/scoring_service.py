"""Reconciles model-reported scores with verified findings and orders issues."""
from __future__ import annotations

import re
from typing import Optional

from app.schemas.review import Issue, Scores

PENALTY = {"Critical": 25, "High": 15, "Medium": 7, "Low": 3, "Info": 0}
ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Info": 4}


def _clamp(n: float) -> int:
    return max(0, min(100, round(n)))


def _is_sec(i: Issue) -> bool:
    return re.search(r"secur|vulnerab", i.category, re.I) is not None


def _is_perf(i: Issue) -> bool:
    return re.search(r"perf|effic", i.category, re.I) is not None


def _is_maint(i: Issue) -> bool:
    return re.search(r"maint|quality|readab|smell", i.category, re.I) is not None


def _penalty(issues: list[Issue], pred) -> int:  # type: ignore[no-untyped-def]
    return sum(PENALTY[i.severity] for i in issues if pred(i))


def reconcile_scores(
    ai: dict[str, Optional[int]], quality: Optional[int], issues: list[Issue]
) -> tuple[int, Scores]:
    """Model scores are estimates. Rules only fill gaps and stop serious findings hiding behind high scores."""
    other = lambda i: not _is_sec(i) and not _is_perf(i) and not _is_maint(i)  # noqa: E731
    readability = ai.get("readability")
    maintainability = ai.get("maintainability")
    efficiency = ai.get("efficiency")
    security = ai.get("security")
    readability = readability if readability is not None else _clamp(100 - _penalty(issues, _is_maint) * 0.8 - _penalty(issues, other) * 0.4)
    maintainability = maintainability if maintainability is not None else _clamp(100 - _penalty(issues, _is_maint) - _penalty(issues, other) * 0.5)
    efficiency = efficiency if efficiency is not None else _clamp(100 - _penalty(issues, _is_perf) * 1.2)
    security = security if security is not None else _clamp(100 - _penalty(issues, _is_sec) * 1.2)

    sec_issues = [i for i in issues if _is_sec(i)]
    if any(i.severity == "Critical" for i in sec_issues):
        security = min(security, 35)
    elif any(i.severity == "High" for i in sec_issues):
        security = min(security, 60)
    elif any(i.severity == "Medium" for i in sec_issues):
        security = min(security, 80)

    mean = (readability + maintainability + efficiency + security) / 4
    q = quality if quality is not None else mean
    if any(i.severity == "Critical" for i in issues):
        q = min(q, 55)
    elif any(i.severity == "High" for i in issues):
        q = min(q, 75)
    elif any(i.severity == "Medium" for i in issues):
        q = min(q, 90)

    return _clamp(q), Scores(readability=readability, maintainability=maintainability, efficiency=efficiency, security=security)


def sort_issues(issues: list[Issue]) -> list[Issue]:
    return sorted(issues, key=lambda i: (ORDER[i.severity], i.line if i.line is not None else 10**9))
