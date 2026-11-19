"""Application configuration, read from environment variables (and an optional .env file)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

try:  # python-dotenv is optional at runtime
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass

SUPPORTED_LANGUAGES = ("python", "java", "c", "cpp", "javascript", "typescript", "html", "css", "sql")
REVIEW_MODES = ("full", "security", "performance", "quick")
EXPLANATION_LEVELS = ("beginner", "intermediate", "advanced")

MAX_CODE_CHARS = 60_000
MAX_CODE_LINES = 2_000


def _split(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    nvidia_api_key: str = field(default_factory=lambda: os.getenv("NVIDIA_API_KEY", "").strip())
    nemotron_model: str = field(
        default_factory=lambda: os.getenv("NEMOTRON_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1.5").strip()
    )
    nvidia_api_base_url: str = field(
        default_factory=lambda: os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1").strip().rstrip("/")
    )
    timeout_seconds: float = field(default_factory=lambda: float(os.getenv("NEMOTRON_TIMEOUT_SECONDS", "90")))
    max_tokens: int = field(default_factory=lambda: int(os.getenv("NEMOTRON_MAX_TOKENS", "6000")))
    tool_timeout_seconds: float = field(default_factory=lambda: float(os.getenv("STATIC_TOOL_TIMEOUT_SECONDS", "20")))
    cors_origins: list[str] = field(
        default_factory=lambda: _split(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"))
    )

    @property
    def ai_configured(self) -> bool:
        return bool(self.nvidia_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
