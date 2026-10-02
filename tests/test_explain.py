"""Automated tests for POST /api/v1/explain endpoint covering all 14 Step 7 requirements."""

import pytest
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import (
    AIGenerationError,
    AIRateLimitError,
    AITimeoutError,
)
from app.schemas.explain import ExplainResponse
from app.services.ai.base import BaseAIService
from app.services.ai_service import get_ai_service


class DummyMockAIService(BaseAIService):
    """Controlled mock AI service simulating Gemini responses without quota consumption."""

    def __init__(self, mode: str = "success") -> None:
        super().__init__(service_name="MockAIService")
        self.mode = mode

    async def answer_question(self, question, context=None, enable_web_grounding=False):
        pass

    async def explain_topic(self, topic, level="beginner", depth="standard", enable_web_grounding=False):
        if self.mode == "timeout":
            raise AITimeoutError("Gemini generation timed out after 30 seconds.")
        if self.mode == "rate_limit":
            raise AIRateLimitError("Gemini rate limit exceeded. Please try again shortly.")
        if self.mode == "malformed":
            raise AIGenerationError("Gemini output missing 'explanation' text in structured payload.")

        return ExplainResponse(
            status="ok",
            topic=topic,
            level=level,
            depth=depth,
            title=f"Understanding {topic}: {level.capitalize()} Guide",
            explanation=f"This is a structured educational explanation for {topic} tailored to the {level} learner level.",
            key_points=[
                f"{topic} core foundational principle 1",
                f"{topic} core foundational principle 2",
                f"{topic} core foundational principle 3",
            ],
            key_takeaways=[
                f"{topic} core foundational principle 1",
                f"{topic} core foundational principle 2",
            ],
            example=f"def demonstrate_{topic.lower().replace(' ', '_')}():\n    return 'Success'",
            analogies=[f"Analogy for {topic}"],
            model="gemini-3.1-flash-lite",
        )

    async def generate_quiz(self, content, question_count, difficulty):
        pass

    async def summarize_text(self, content, format, max_length_words=None):
        pass

    async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
        pass


# 1. Valid beginner explanation
def test_valid_beginner_explanation(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/explain",
        json={"topic": "Recursion", "level": "beginner"},
        headers={"X-Request-ID": "test-req-beg-101"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Recursion"
    assert data["level"] == "beginner"
    assert "Understanding Recursion" in data["title"]
    assert "Recursion" in data["explanation"]
    assert len(data["key_points"]) == 3
    assert "def demonstrate_recursion" in data["example"]
    assert data["request_id"] == "test-req-beg-101"


# 2. Valid intermediate explanation
def test_valid_intermediate_explanation(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/explain",
        json={"topic": "REST API", "level": "intermediate"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "REST API"
    assert data["level"] == "intermediate"
    assert len(data["key_points"]) >= 1


# 3. Valid advanced explanation
def test_valid_advanced_explanation(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/explain",
        json={"topic": "Binary Search", "level": "advanced"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Binary Search"
    assert data["level"] == "advanced"


# 4. Empty topic validation
def test_reject_empty_topic(client: TestClient) -> None:
    # Test whitespace-only topic
    res_space = client.post("/api/v1/explain", json={"topic": "   ", "level": "beginner"})
    assert res_space.status_code == 422
    assert res_space.json()["error"]["code"] == "VALIDATION_ERROR"

    # Test empty string topic
    res_empty = client.post("/api/v1/explain", json={"topic": "", "level": "beginner"})
    assert res_empty.status_code == 422
    assert res_empty.json()["error"]["code"] == "VALIDATION_ERROR"

    # Test missing topic entirely
    res_none = client.post("/api/v1/explain", json={"level": "beginner"})
    assert res_none.status_code == 422
    assert res_none.json()["error"]["code"] == "VALIDATION_ERROR"


# 5. Oversized topic validation
def test_reject_oversized_topic(client: TestClient) -> None:
    oversized = "A" * 501
    response = client.post("/api/v1/explain", json={"topic": oversized, "level": "beginner"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 6. Invalid level validation
def test_reject_invalid_level(client: TestClient) -> None:
    response = client.post("/api/v1/explain", json={"topic": "Calculus", "level": "hyper_genius"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 7. Unauthenticated request rejected with HTTP 401
def test_unauthenticated_request_rejected(app, client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post("/api/v1/explain", json={"topic": "Photosynthesis"})
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] in ("AUTHENTICATION_REQUIRED", "INVALID_TOKEN")
    finally:
        mock_user = AuthenticatedUser(
            uid="test-student-uid-12345",
            email="student@edugenie.test",
            display_name="Test Student",
            email_verified=True,
            claims={"uid": "test-student-uid-12345", "email": "student@edugenie.test"},
        )
        app.dependency_overrides[get_current_user] = lambda: mock_user


# 8. Invalid Firebase token rejected with HTTP 401
def test_invalid_firebase_token_rejected(app, client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post(
            "/api/v1/explain",
            json={"topic": "Quantum Computing"},
            headers={"Authorization": "Bearer bad.token.here"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] in ("INVALID_TOKEN", "SESSION_EXPIRED", "AUTHENTICATION_REQUIRED")
    finally:
        mock_user = AuthenticatedUser(
            uid="test-student-uid-12345",
            email="student@edugenie.test",
            display_name="Test Student",
            email_verified=True,
            claims={"uid": "test-student-uid-12345", "email": "student@edugenie.test"},
        )
        app.dependency_overrides[get_current_user] = lambda: mock_user


# 9. Gemini success flow
def test_gemini_success_response_structure(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/explain",
        json={"topic": "Machine Learning", "level": "intermediate"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "explanation" in data
    assert "key_points" in data
    assert "example" in data
    assert isinstance(data["key_points"], list)
    assert len(data["key_points"]) > 0


# 10. Gemini timeout handling
def test_gemini_timeout_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="timeout")
    response = client.post("/api/v1/explain", json={"topic": "Complex Analysis"})
    assert response.status_code == 504
    data = response.json()
    assert data["error"]["code"] == "AI_TIMEOUT"
    assert "request_id" in data["error"]


# 11. Gemini rate limit handling
def test_gemini_rate_limit_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="rate_limit")
    response = client.post("/api/v1/explain", json={"topic": "Topology"})
    assert response.status_code == 429
    data = response.json()
    assert data["error"]["code"] == "AI_RATE_LIMITED"


# 12. Malformed AI output handling
def test_malformed_ai_output_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="malformed")
    response = client.post("/api/v1/explain", json={"topic": "Linear Algebra"})
    assert response.status_code == 502
    data = response.json()
    assert data["error"]["code"] == "AI_GENERATION_ERROR"


# 13. Request ID generation and propagation
def test_request_id_generation_and_propagation(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")

    # Provided custom request ID
    res_custom = client.post(
        "/api/v1/explain",
        json={"topic": "Graphs"},
        headers={"X-Request-ID": "custom-explain-trace-999"},
    )
    assert res_custom.status_code == 200
    assert res_custom.json()["request_id"] == "custom-explain-trace-999"
    assert res_custom.headers.get("X-Request-ID") == "custom-explain-trace-999"

    # Auto-generated request ID when omitted
    res_auto = client.post("/api/v1/explain", json={"topic": "Trees"})
    assert res_auto.status_code == 200
    auto_id = res_auto.json()["request_id"]
    assert auto_id.startswith("req-")
    assert res_auto.headers.get("X-Request-ID") == auto_id


# 14. Secret protection audit
def test_secret_protection_in_explain_responses(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post("/api/v1/explain", json={"topic": "Security"})
    text_content = response.text
    assert "AIza" not in text_content
    assert "GEMINI_API_KEY" not in text_content
    assert "Bearer" not in text_content
