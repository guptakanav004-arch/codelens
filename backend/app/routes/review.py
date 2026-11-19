"""Review endpoints. All model logic lives in services; routes only validate and delegate."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.review import (
    CodeRequest, ExplainResponse, OptimizeResponse, ReviewResponse, SecurityReviewResponse,
)
from app.services import review_service

router = APIRouter(prefix="/api", tags=["review"])


@router.post("/review", response_model=ReviewResponse, summary="Run a full code review")
async def review(body: CodeRequest) -> ReviewResponse:
    return await review_service.run_review(review_service.validate_request(body))


@router.post("/explain", response_model=ExplainResponse, summary="Explain code at a chosen level")
async def explain(body: CodeRequest) -> ExplainResponse:
    return await review_service.run_explain(review_service.validate_request(body))


@router.post("/optimize", response_model=OptimizeResponse, summary="Suggest an optimized version of the code")
async def optimize(body: CodeRequest) -> OptimizeResponse:
    return await review_service.run_optimize(review_service.validate_request(body))


@router.post("/security-review", response_model=SecurityReviewResponse, summary="Focused security review")
async def security_review(body: CodeRequest) -> SecurityReviewResponse:
    return await review_service.run_security_review(review_service.validate_request(body))
