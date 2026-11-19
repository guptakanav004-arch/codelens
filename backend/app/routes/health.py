from __future__ import annotations

import importlib.util
import shutil

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["health"])


def _has(module: str, binary: str | None = None) -> bool:
    return importlib.util.find_spec(module) is not None or (binary is not None and shutil.which(binary) is not None)


@router.get("/health", summary="Service health and configuration status")
async def health() -> dict:
    cfg = get_settings()
    return {
        "ok": True,
        "service": "codelens-ai",
        "engine": "python-fastapi",
        "ai_configured": cfg.ai_configured,
        "model": cfg.nemotron_model,
        "tools": {
            "ruff": _has("ruff", "ruff"),
            "bandit": _has("bandit", "bandit"),
            "radon": _has("radon"),
            "eslint": shutil.which("eslint") is not None,
        },
    }
