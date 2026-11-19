"""CodeLens AI backend entrypoint.  Run with:  uvicorn app.main:app --reload --port 8000"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.errors import ApiError
from app.routes import health, review
from app.utils.logging import get_logger

log = get_logger("codelens")

app = FastAPI(
    title="CodeLens AI API",
    version="1.0.0",
    description="AI-assisted code review: static analysis + NVIDIA Nemotron. Submitted code is never executed.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    return _error(exc.status, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return _error(400, "invalid_request", "Request body must be a valid JSON object.")


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error: %s", type(exc).__name__)  # stack trace goes to logs only, never to the client
    return _error(500, "internal_error", "Something went wrong while analyzing your code. Please try again.")


app.include_router(health.router)
app.include_router(review.router)
