"""Pydantic models: API contracts and validation of the (untrusted) AI response."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

Severity = Literal["Critical", "High", "Medium", "Low", "Info"]
SEVERITIES: tuple[str, ...] = ("Critical", "High", "Medium", "Low", "Info")


# --------------------------------------------------------------------------- requests
class CodeRequest(BaseModel):
    """Loosely typed on purpose: semantic validation raises ApiError with friendly codes."""

    code: Any = None
    language: Any = None
    review_mode: Any = "full"
    explanation_level: Any = None
    level: Any = None


class ValidatedRequest(BaseModel):
    code: str
    language: str
    review_mode: str = "full"
    explanation_level: str = "intermediate"


# --------------------------------------------------------------------------- static analysis
class StaticFinding(BaseModel):
    tool: str
    rule: str
    message: str
    severity: Severity
    category: str
    line: Optional[int] = None


class ToolStatus(BaseModel):
    tool: str
    status: Literal["ok", "unavailable", "failed", "skipped"]
    detail: Optional[str] = None
    findings: int = 0


class FunctionMetric(BaseModel):
    name: str
    line: int
    complexity: int
    rank: str


class StaticMetrics(BaseModel):
    total_lines: int
    code_lines: int
    comment_lines: int
    blank_lines: int
    function_count: Optional[int] = None
    max_nesting_depth: Optional[int] = None
    cyclomatic_complexity: Optional[int] = None
    source: str = "heuristic"
    functions: list[FunctionMetric] = Field(default_factory=list)
    maintainability_index: Optional[float] = None


class StaticAnalysisResult(BaseModel):
    tools: list[ToolStatus]
    findings: list[StaticFinding]
    metrics: StaticMetrics


# --------------------------------------------------------------------------- response
class Issue(BaseModel):
    id: str
    title: str
    category: str
    severity: Severity
    line: Optional[int] = None
    description: str = ""
    impact: str = ""
    suggestion: str = ""
    fixed_code: Optional[str] = None
    source: Literal["ai", "static"] = "ai"
    tool: Optional[str] = None
    rule: Optional[str] = None


class Scores(BaseModel):
    readability: int
    maintainability: int
    efficiency: int
    security: int


class Complexity(BaseModel):
    time: str
    space: str
    explanation: str
    optimization: Optional[str] = None


class ReviewMeta(BaseModel):
    duration_ms: int
    model: str
    analyzed_at: str
    engine: str
    lines: int


class ReviewResponse(BaseModel):
    id: str
    language: str
    review_mode: str
    summary: str
    quality_score: int
    scores: Scores
    complexity: Complexity
    issues: list[Issue]
    optimized_code: Optional[str] = None
    optimization_notes: list[str] = Field(default_factory=list)
    explanation: str = ""
    explanation_level: str = "intermediate"
    recommendations: list[str] = Field(default_factory=list)
    static_analysis: StaticAnalysisResult
    meta: ReviewMeta


class ExplainResponse(BaseModel):
    explanation: str
    level: str


class OptimizeResponse(BaseModel):
    optimized_code: Optional[str] = None
    notes: list[str] = Field(default_factory=list)
    summary: str = ""


class SecurityReviewResponse(BaseModel):
    summary: str
    security_score: int
    issues: list[Issue]
    recommendations: list[str] = Field(default_factory=list)
    static_findings: list[StaticFinding]
    tools: list[ToolStatus]
    disclaimer: str


# --------------------------------------------------------------------------- AI output (lenient validation)
def _norm_severity(v: Any) -> str:
    s = str(v or "").strip().lower()
    for sev in SEVERITIES:
        if sev.lower() == s:
            return sev
    return {"major": "High", "error": "High", "minor": "Medium", "warning": "Medium",
            "informational": "Info", "note": "Info", "suggestion": "Info"}.get(s, "Low")


def _score(v: Any) -> Optional[int]:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    if n != n:  # NaN
        return None
    return max(0, min(100, round(n)))


def _opt_str(v: Any) -> Optional[str]:
    return v if isinstance(v, str) and v.strip() else None


def _str(v: Any) -> str:
    return v if isinstance(v, str) else ""


def _str_list(v: Any) -> list[str]:
    return [x for x in v if isinstance(x, str)] if isinstance(v, list) else []


class AIIssue(BaseModel):
    title: str = Field(min_length=1)
    category: str = "Quality"
    severity: str = "Low"
    line: Optional[int] = None
    description: str = ""
    impact: str = ""
    suggestion: str = ""
    fixed_code: Optional[str] = None

    @field_validator("category", mode="before")
    @classmethod
    def _cat(cls, v: Any) -> str:
        return v.strip() if isinstance(v, str) and v.strip() else "Quality"

    @field_validator("severity", mode="before")
    @classmethod
    def _sev(cls, v: Any) -> str:
        return _norm_severity(v)

    @field_validator("line", mode="before")
    @classmethod
    def _line(cls, v: Any) -> Optional[int]:
        if isinstance(v, str) and v.strip().isdigit():
            v = int(v)
        return v if isinstance(v, int) and not isinstance(v, bool) and v > 0 else None

    @field_validator("description", "impact", "suggestion", mode="before")
    @classmethod
    def _text(cls, v: Any) -> str:
        return _str(v)

    @field_validator("fixed_code", mode="before")
    @classmethod
    def _fixed(cls, v: Any) -> Optional[str]:
        return _opt_str(v)


class AIScores(BaseModel):
    readability: Optional[int] = None
    maintainability: Optional[int] = None
    efficiency: Optional[int] = None
    security: Optional[int] = None

    @field_validator("*", mode="before")
    @classmethod
    def _s(cls, v: Any) -> Optional[int]:
        return _score(v)


class AIComplexity(BaseModel):
    time: str = ""
    space: str = ""
    explanation: str = ""
    optimization: Optional[str] = None

    @field_validator("time", "space", "explanation", mode="before")
    @classmethod
    def _t(cls, v: Any) -> str:
        return _str(v)

    @field_validator("optimization", mode="before")
    @classmethod
    def _o(cls, v: Any) -> Optional[str]:
        return _opt_str(v)


class AIReview(BaseModel):
    summary: str = Field(min_length=1)
    quality_score: Optional[int] = None
    scores: AIScores = Field(default_factory=AIScores)
    complexity: AIComplexity = Field(default_factory=AIComplexity)
    issues: list[Any]
    optimized_code: Optional[str] = None
    optimization_notes: list[str] = Field(default_factory=list)
    explanation: str = ""
    recommendations: list[str] = Field(default_factory=list)

    @field_validator("quality_score", mode="before")
    @classmethod
    def _q(cls, v: Any) -> Optional[int]:
        return _score(v)

    @field_validator("scores", "complexity", mode="before")
    @classmethod
    def _obj(cls, v: Any) -> Any:
        return v if isinstance(v, dict) else {}

    @field_validator("optimized_code", mode="before")
    @classmethod
    def _oc(cls, v: Any) -> Optional[str]:
        return _opt_str(v)

    @field_validator("explanation", mode="before")
    @classmethod
    def _e(cls, v: Any) -> str:
        return _str(v)

    @field_validator("optimization_notes", "recommendations", mode="before")
    @classmethod
    def _l(cls, v: Any) -> list[str]:
        return _str_list(v)


class AIExplain(BaseModel):
    explanation: str = Field(min_length=1)


class AIOptimize(BaseModel):
    summary: str = ""
    optimized_code: str = Field(min_length=1)
    notes: list[str] = Field(default_factory=list)

    @field_validator("summary", mode="before")
    @classmethod
    def _s(cls, v: Any) -> str:
        return _str(v)

    @field_validator("notes", mode="before")
    @classmethod
    def _n(cls, v: Any) -> list[str]:
        return _str_list(v)


class AISecurity(BaseModel):
    summary: str = Field(min_length=1)
    security_score: Optional[int] = None
    issues: list[Any]
    recommendations: list[str] = Field(default_factory=list)

    @field_validator("security_score", mode="before")
    @classmethod
    def _q(cls, v: Any) -> Optional[int]:
        return _score(v)

    @field_validator("recommendations", mode="before")
    @classmethod
    def _l(cls, v: Any) -> list[str]:
        return _str_list(v)
