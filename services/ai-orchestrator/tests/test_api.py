from fastapi.testclient import TestClient

from app.main import app
from app.api import routes


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/internal/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["openai"]["probeStatus"] == "skipped"


def test_memory_extract_endpoint() -> None:
    client = TestClient(app)
    response = client.post(
        "/internal/memory/extract",
        json={
            "requestId": "req_1",
            "tenantId": "tenant_1",
            "teacherId": "teacher_1",
            "userId": "user_1",
            "conversationId": "conv_1",
            "sourceMessageId": "msg_1",
            "userMessage": "我想在一个月内拿到算法岗 offer，请用中文回答。",
            "assistantMessage": "好的，我会帮你做算法训练。",
            "preferredLanguage": "zh-CN",
            "responseStyle": "balanced",
            "correctionMode": "strict",
        },
    )

    assert response.status_code == 200
    assert any(item["memoryType"] == "GOAL" for item in response.json())


def test_health_endpoint_should_include_upstream_probe(monkeypatch) -> None:
    client = TestClient(app)
    class FakeSettings:
        openai_api_key = "test-key"
        openai_model = "gpt-4.1-mini"
        normalized_openai_base_url = "https://gateway.example.com/v1"

    monkeypatch.setattr(routes, "get_settings", lambda: FakeSettings())
    monkeypatch.setattr(
        routes,
        "probe_openai_capabilities",
        lambda api_key, base_url, model: {
            "baseUrl": base_url,
            "models": {"ok": True},
            "responses": {"ok": True},
            "files": {"ok": True},
            "vectorStores": {"ok": True},
            "readyForKnowledge": True,
        },
    )

    response = client.get("/internal/health?probe_upstream=true")

    assert response.status_code == 200
    assert response.json()["openai"]["probeStatus"] == "completed"
    assert response.json()["openai"]["capabilities"]["readyForKnowledge"] is True
