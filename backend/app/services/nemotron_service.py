"""NVIDIA Nemotron client (OpenAI-compatible chat completions). The API key never leaves the server."""
from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.errors import ApiError
from app.utils.logging import get_logger
from app.utils.response_parser import parse_model_json

log = get_logger(__name__)


async def call_nemotron(system: str, user: str) -> str:
    cfg = get_settings()
    if not cfg.ai_configured:
        raise ApiError(
            503,
            "ai_not_configured",
            "NVIDIA API is not configured. Set NVIDIA_API_KEY (and optionally NEMOTRON_MODEL / NVIDIA_API_BASE_URL) "
            "on the server to enable AI reviews.",
        )

    payload: dict[str, Any] = {
        "model": cfg.nemotron_model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.2,
        "top_p": 0.9,
        "max_tokens": cfg.max_tokens,
        "stream": False,
    }
    headers = {"Authorization": f"Bearer {cfg.nvidia_api_key}", "Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(cfg.timeout_seconds, connect=10.0)) as client:
            res = await client.post(f"{cfg.nvidia_api_base_url}/chat/completions", json=payload, headers=headers)
    except httpx.TimeoutException:
        raise ApiError(504, "ai_timeout", "The AI model took too long to respond. Try again, or analyze a smaller piece of code.")
    except httpx.HTTPError as exc:
        log.error("Nemotron network error: %s", type(exc).__name__)
        raise ApiError(502, "ai_unavailable", "Could not reach the NVIDIA API. Check your network connection and NVIDIA_API_BASE_URL.")

    if res.status_code >= 400:
        log.error("Nemotron API error %s: %s", res.status_code, res.text[:300])
        if res.status_code in (401, 403):
            raise ApiError(502, "ai_invalid_key", "The NVIDIA API rejected the credentials. Check that NVIDIA_API_KEY is valid and has access to the selected model.")
        if res.status_code == 404:
            raise ApiError(502, "ai_model_not_found", "The configured Nemotron model was not found. Check NEMOTRON_MODEL.")
        if res.status_code == 429:
            raise ApiError(429, "ai_rate_limited", "The NVIDIA API rate limit was reached. Please wait a moment and try again.")
        raise ApiError(502, "ai_unavailable", f"The NVIDIA API returned an error (HTTP {res.status_code}). Please try again shortly.")

    try:
        data = res.json()
        content = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError):
        raise ApiError(502, "ai_malformed_response", "The NVIDIA API returned an unreadable response.")
    if not isinstance(content, str) or not content.strip():
        raise ApiError(502, "ai_malformed_response", "The AI returned an empty response. Please try again.")
    return content


async def call_nemotron_json(system: str, user: str) -> dict[str, Any]:
    return parse_model_json(await call_nemotron(system, user))
