"""Backend tests. The Nemotron call is mocked; nothing here contacts the NVIDIA API."""
import json

import pytest
from fastapi.testclient import TestClient

from app.errors import ApiError
from app.main import app
from app.services import nemotron_service
from app.services.static_analysis import run_static_analysis
from app.utils.response_parser import parse_model_json

client = TestClient(app)

PY_CODE = '''import pickle
import hashlib
PASSWORD = "supersecret123"

def load(blob, items=[]):
    items.append(1)
    return pickle.loads(blob)

def h(p):
    return hashlib.md5(p.encode()).hexdigest()
'''

GOOD_AI = {
    "summary": "Has unsafe deserialization.",
    "quality_score": 95,
    "scores": {"readability": 90, "maintainability": 90, "efficiency": 90, "security": 99},
    "complexity": {"time": "O(1)", "space": "O(1)", "explanation": "Estimate."},
    "issues": [
        {"title": "Unsafe pickle", "category": "Security", "severity": "high", "line": 7,
         "description": "d", "impact": "i", "suggestion": "s", "fixed_code": None},
        {"title": "Invented line", "category": "Bug", "severity": "Low", "line": 9999},
        {"not": "an issue"},
    ],
    "optimized_code": None,
    "explanation": "It loads data.",
    "recommendations": ["Avoid pickle"],
}


def fake_ai(payload: str):
    async def _fake(system: str, user: str) -> str:
        return payload

    return _fake


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_empty_code_rejected():
    r = client.post("/api/review", json={"code": "   ", "language": "python"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "empty_code"


def test_unsupported_language():
    r = client.post("/api/review", json={"code": "x=1", "language": "cobol"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "unsupported_language"


def test_large_input():
    r = client.post("/api/review", json={"code": "a" * 70_000, "language": "python"})
    assert r.status_code == 413


def test_invalid_body():
    r = client.post("/api/review", content="not json", headers={"Content-Type": "application/json"})
    assert r.status_code == 400


def test_ai_not_configured(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "")
    from app.config import get_settings

    get_settings.cache_clear()
    r = client.post("/api/review", json={"code": PY_CODE, "language": "python"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "ai_not_configured"
    get_settings.cache_clear()


def test_review_success_merges_and_validates(monkeypatch):
    monkeypatch.setattr(nemotron_service, "call_nemotron", fake_ai("```json\n" + json.dumps(GOOD_AI) + "\n```"))
    r = client.post("/api/review", json={"code": PY_CODE, "language": "python"})
    assert r.status_code == 200, r.text
    body = r.json()
    ai_issues = [i for i in body["issues"] if i["source"] == "ai"]
    assert {i["title"] for i in ai_issues} == {"Unsafe pickle", "Invented line"}
    invented = next(i for i in ai_issues if i["title"] == "Invented line")
    assert invented["line"] is None  # out-of-range line numbers are dropped
    assert next(i for i in ai_issues if i["title"] == "Unsafe pickle")["severity"] == "High"
    assert body["quality_score"] <= 75  # capped because a High issue exists
    assert body["scores"]["security"] <= 60
    assert any(i["source"] == "static" for i in body["issues"])


def test_malformed_ai_response(monkeypatch):
    monkeypatch.setattr(nemotron_service, "call_nemotron", fake_ai("Sorry, I cannot help with that."))
    r = client.post("/api/review", json={"code": PY_CODE, "language": "python"})
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "ai_malformed_response"


def test_incomplete_ai_response(monkeypatch):
    monkeypatch.setattr(nemotron_service, "call_nemotron", fake_ai(json.dumps({"quality_score": 80})))
    r = client.post("/api/review", json={"code": PY_CODE, "language": "python"})
    assert r.status_code == 502


def test_explain(monkeypatch):
    monkeypatch.setattr(nemotron_service, "call_nemotron", fake_ai(json.dumps({"explanation": "Simple."})))
    r = client.post("/api/explain", json={"code": PY_CODE, "language": "python", "level": "beginner"})
    assert r.status_code == 200
    assert r.json() == {"explanation": "Simple.", "level": "beginner"}


def test_parser_recovery():
    raw = '<think>hmm</think>```json\n{"a": [1, 2,], "b": "x"}\n```'
    assert parse_model_json(raw) == {"a": [1, 2], "b": "x"}
    with pytest.raises(ApiError):
        parse_model_json('{"summary": "truncated')


def test_static_analysis_python():
    result = run_static_analysis(PY_CODE, "python")
    rules = {f.rule for f in result.findings}
    assert "py-pickle" in rules or any("pickle" in r.lower() or r.startswith("B301") for r in rules)
    assert any(f.rule == "mutable-default-arg" for f in result.findings)
    statuses = {t.tool: t.status for t in result.tools}
    assert statuses["python-ast"] == "ok"
    assert statuses["ruff"] in ("ok", "unavailable", "failed")  # graceful when missing


def test_static_analysis_syntax_error():
    result = run_static_analysis("def broken(:\n  pass", "python")
    assert any(f.rule == "syntax-error" for f in result.findings)


def test_static_analysis_cpp():
    result = run_static_analysis("int main(){ char b[8]; gets(b); strcpy(b, x); }", "cpp")
    assert {"c-gets", "c-strcpy"} <= {f.rule for f in result.findings}
