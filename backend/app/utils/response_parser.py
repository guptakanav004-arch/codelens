"""Robust extraction of JSON from LLM output, with controlled recovery."""
from __future__ import annotations

import json
import re
from typing import Any, Optional, Type, TypeVar

from pydantic import BaseModel, ValidationError

from app.errors import ApiError
from app.utils.logging import get_logger

log = get_logger(__name__)
T = TypeVar("T", bound=BaseModel)

_THINK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)


def strip_wrappers(text: str) -> str:
    """Remove reasoning blocks and markdown fences that models sometimes add."""
    t = _THINK.sub("", text)
    t = re.sub(r"^.*?</think>", "", t, flags=re.DOTALL | re.IGNORECASE)
    m = _FENCE.search(t)
    if m and "{" in m.group(1):
        t = m.group(1)
    return t.strip()


def extract_json_object(text: str) -> Optional[str]:
    """Return the first balanced top-level JSON object (string-aware), or None if truncated."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _loads(s: str) -> Any:
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        repaired = re.sub(r",\s*([}\]])", r"\1", s)
        repaired = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", repaired)
        return json.loads(repaired)


def parse_model_json(raw: str) -> dict[str, Any]:
    cleaned = strip_wrappers(raw)
    obj = extract_json_object(cleaned)
    if obj is None:
        raise ApiError(
            502,
            "ai_malformed_response",
            "The AI returned an incomplete or non-JSON response (it may have been truncated). Please try again.",
        )
    try:
        data = _loads(obj)
    except json.JSONDecodeError:
        raise ApiError(502, "ai_malformed_response", "The AI returned malformed JSON that could not be recovered. Please try again.")
    if not isinstance(data, dict):
        raise ApiError(502, "ai_malformed_response", "The AI response was not a JSON object.")
    return data


def validate_model(model: Type[T], data: dict[str, Any]) -> T:
    try:
        return model.model_validate(data)
    except ValidationError as exc:
        log.error("AI response failed validation: %s", [f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors()[:3]])
        raise ApiError(
            502,
            "ai_malformed_response",
            "The AI response was incomplete or did not match the expected structure. Please try again.",
        )
