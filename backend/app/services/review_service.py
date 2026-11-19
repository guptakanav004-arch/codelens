"""Review workflow: validate -> static analysis -> Nemotron -> validate AI output -> merge -> score."""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError

from app.config import (
    EXPLANATION_LEVELS, MAX_CODE_CHARS, MAX_CODE_LINES, REVIEW_MODES, SUPPORTED_LANGUAGES, get_settings,
)
from app.errors import ApiError
from app.schemas.review import (
    AIExplain, AIIssue, AIOptimize, AIReview, AISecurity, CodeRequest, ExplainResponse, Issue, OptimizeResponse,
    ReviewMeta, ReviewResponse, SecurityReviewResponse, StaticFinding, ValidatedRequest, Complexity,
)
from app.services.nemotron_service import call_nemotron_json
from app.services.scoring_service import reconcile_scores, sort_issues
from app.services.static_analysis import run_static_analysis
from app.utils import prompts
from app.utils.response_parser import validate_model

DISCLAIMER = "Security findings are automated suggestions and do not replace a professional security audit."


def validate_request(req: CodeRequest) -> ValidatedRequest:
    code = req.code
    if not isinstance(code, str) or not code.strip():
        raise ApiError(422, "empty_code", "Please provide some source code to analyze.")
    if len(code) > MAX_CODE_CHARS:
        raise ApiError(413, "code_too_large", f"Source code is too large ({len(code):,} characters). The limit is {MAX_CODE_CHARS:,} characters.")
    if code.count("\n") + 1 > MAX_CODE_LINES:
        raise ApiError(413, "code_too_large", f"Source code has more than {MAX_CODE_LINES} lines, which is the limit.")
    if "\x00" in code:
        raise ApiError(422, "invalid_code", "Source code appears to be binary and cannot be analyzed.")
    language = str(req.language or "").lower()
    if language not in SUPPORTED_LANGUAGES:
        raise ApiError(400, "unsupported_language", f'Unsupported language "{req.language or ""}". Supported: {", ".join(SUPPORTED_LANGUAGES)}.')
    mode = str(req.review_mode or "full").lower()
    if mode not in REVIEW_MODES:
        raise ApiError(400, "invalid_review_mode", f"Invalid review mode. Use one of: {', '.join(REVIEW_MODES)}.")
    level = str(req.level or req.explanation_level or "intermediate").lower()
    if level not in EXPLANATION_LEVELS:
        raise ApiError(400, "invalid_level", f"Invalid level. Use one of: {', '.join(EXPLANATION_LEVELS)}.")
    return ValidatedRequest(code=code.replace("\r\n", "\n"), language=language, review_mode=mode, explanation_level=level)


def _validate_issues(items: list[Any], total_lines: int) -> list[Issue]:
    out: list[Issue] = []
    for idx, item in enumerate(items):
        try:
            ai = AIIssue.model_validate(item)
        except ValidationError:
            continue  # one bad issue must not discard the whole review
        line = ai.line if ai.line is not None and ai.line <= total_lines else None  # never trust model line numbers blindly
        out.append(Issue(
            id=f"ai-{idx + 1}", title=ai.title, category=ai.category, severity=ai.severity,  # type: ignore[arg-type]
            line=line, description=ai.description, impact=ai.impact, suggestion=ai.suggestion,
            fixed_code=ai.fixed_code, source="ai", tool="nemotron",
        ))
    return out


def _static_to_issues(findings: list[StaticFinding], existing: list[Issue]) -> list[Issue]:
    out: list[Issue] = []
    for idx, f in enumerate(findings):
        if any(e.line is not None and e.line == f.line and e.category.lower() == f.category.lower() for e in existing):
            continue
        out.append(Issue(
            id=f"static-{idx + 1}", title=f.message.rstrip("."), category=f.category, severity=f.severity,
            line=f.line, description=f.message,
            impact="Reported by automated static analysis. Verify in context; static tools can produce false positives.",
            suggestion="", fixed_code=None, source="static", tool=f.tool, rule=f.rule,
        ))
    return out


async def run_review(req: ValidatedRequest) -> ReviewResponse:
    started = time.perf_counter()
    lines = req.code.count("\n") + 1
    static = await run_in_threadpool(run_static_analysis, req.code, req.language)
    raw = await call_nemotron_json(
        prompts.SYSTEM_PROMPT,
        prompts.build_review_prompt(req.code, req.language, req.review_mode, req.explanation_level, static.findings, prompts.make_nonce()),
    )
    ai = validate_model(AIReview, raw)

    ai_issues = _validate_issues(ai.issues, lines)
    issues = sort_issues(ai_issues + _static_to_issues(static.findings, ai_issues))
    quality, scores = reconcile_scores(ai.scores.model_dump(), ai.quality_score, issues)

    return ReviewResponse(
        id=str(uuid.uuid4()), language=req.language, review_mode=req.review_mode, summary=ai.summary,
        quality_score=quality, scores=scores,
        complexity=Complexity(
            time=ai.complexity.time or "Unknown", space=ai.complexity.space or "Unknown",
            explanation=ai.complexity.explanation or "The model did not provide a complexity explanation.",
            optimization=ai.complexity.optimization,
        ),
        issues=issues, optimized_code=ai.optimized_code, optimization_notes=ai.optimization_notes,
        explanation=ai.explanation, explanation_level=req.explanation_level, recommendations=ai.recommendations,
        static_analysis=static,
        meta=ReviewMeta(
            duration_ms=round((time.perf_counter() - started) * 1000), model=get_settings().nemotron_model,
            analyzed_at=datetime.now(timezone.utc).isoformat(), engine="python-fastapi", lines=lines,
        ),
    )


async def run_explain(req: ValidatedRequest) -> ExplainResponse:
    raw = await call_nemotron_json(
        prompts.SYSTEM_PROMPT, prompts.build_explain_prompt(req.code, req.language, req.explanation_level, prompts.make_nonce())
    )
    ai = validate_model(AIExplain, raw)
    return ExplainResponse(explanation=ai.explanation, level=req.explanation_level)


async def run_optimize(req: ValidatedRequest) -> OptimizeResponse:
    static = await run_in_threadpool(run_static_analysis, req.code, req.language)
    raw = await call_nemotron_json(
        prompts.SYSTEM_PROMPT, prompts.build_optimize_prompt(req.code, req.language, static.findings, prompts.make_nonce())
    )
    ai = validate_model(AIOptimize, raw)
    return OptimizeResponse(optimized_code=ai.optimized_code, notes=ai.notes, summary=ai.summary)


async def run_security_review(req: ValidatedRequest) -> SecurityReviewResponse:
    lines = req.code.count("\n") + 1
    static = await run_in_threadpool(run_static_analysis, req.code, req.language)
    raw = await call_nemotron_json(
        prompts.SYSTEM_PROMPT, prompts.build_security_prompt(req.code, req.language, static.findings, prompts.make_nonce())
    )
    ai = validate_model(AISecurity, raw)
    issues = sort_issues([i.model_copy(update={"category": "Security"}) for i in _validate_issues(ai.issues, lines)])
    _, scores = reconcile_scores({"security": ai.security_score}, None, issues)
    return SecurityReviewResponse(
        summary=ai.summary, security_score=scores.security, issues=issues, recommendations=ai.recommendations,
        static_findings=[f for f in static.findings if "secur" in f.category.lower()],
        tools=static.tools, disclaimer=DISCLAIMER,
    )
