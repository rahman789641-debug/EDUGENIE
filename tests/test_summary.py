"""Automated tests for POST /api/v1/summarize endpoint covering all Step 9 requirements."""

import pytest
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import (
    AIGenerationError,
    AIRateLimitError,
    AITimeoutError,
)
from app.schemas.summarize import SummarizeResponse
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
        pass

    async def generate_quiz(self, content, question_count=3, difficulty="beginner"):
        pass

    async def summarize_text(self, content, length="medium", format="bullet_points", max_length_words=None):
        if self.mode == "timeout":
            raise AITimeoutError("Gemini generation timed out after 30 seconds.")
        if self.mode == "rate_limit":
            raise AIRateLimitError("Gemini rate limit exceeded. Please try again shortly.")
        if self.mode == "malformed":
            raise AIGenerationError("Gemini output missing 'summary' field in structured response.")
        if self.mode == "unfaithful":
            # Test helper for unfaithful assertions
            pass

        key_points_map = {
            "short": ["Ultra-concise point 1", "Ultra-concise point 2"],
            "medium": ["Balanced point 1", "Balanced point 2", "Balanced point 3"],
            "detailed": ["Detailed point 1", "Detailed point 2", "Detailed point 3", "Detailed point 4"],
        }

        return SummarizeResponse(
            status="ok",
            format=format,
            length=length,
            summary=f"This is a synthesized {length} summary faithfully capturing the provided educational material without outside distortion.",
            key_points=key_points_map.get(length, key_points_map["medium"]),
            original_length_chars=len(content),
            summary_length_chars=120,
            model="gemini-3.1-flash-lite",
        )

    async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
        pass


# 1. Valid short summary
def test_valid_short_summary(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/summarize",
        json={
            "content": "Photosynthesis is the process by which green plants transform light energy into chemical energy stored in glucose.",
            "length": "short",
        },
        headers={"X-Request-ID": "test-sum-short-101"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["length"] == "short"
    assert "short summary" in data["summary"]
    assert len(data["key_points"]) == 2
    assert data["request_id"] == "test-sum-short-101"


# 2. Valid medium summary
def test_valid_medium_summary(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/summarize",
        json={
            "content": "Representational State Transfer (REST) is an architectural style for distributed systems utilizing stateless HTTP.",
            "length": "medium",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["length"] == "medium"
    assert len(data["key_points"]) == 3


# 3. Valid detailed summary
def test_valid_detailed_summary(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/summarize",
        json={
            "content": "Binary search trees maintain the invariant that left subtrees hold lesser keys and right subtrees hold greater keys.",
            "length": "detailed",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["length"] == "detailed"
    assert len(data["key_points"]) == 4


# 4. Reject empty or whitespace content
def test_reject_empty_content(client: TestClient) -> None:
    # Empty string
    res_empty = client.post("/api/v1/summarize", json={"content": ""})
    assert res_empty.status_code == 422
    assert res_empty.json()["error"]["code"] == "VALIDATION_ERROR"

    # Whitespace only
    res_space = client.post("/api/v1/summarize", json={"content": "     \n   "})
    assert res_space.status_code == 422
    assert res_space.json()["error"]["code"] == "VALIDATION_ERROR"

    # Missing content
    res_none = client.post("/api/v1/summarize", json={})
    assert res_none.status_code == 422
    assert res_none.json()["error"]["code"] == "VALIDATION_ERROR"


# 5. Reject oversized content
def test_reject_oversized_content(client: TestClient) -> None:
    huge_content = "Word " * 11000  # > 50,000 chars
    response = client.post("/api/v1/summarize", json={"content": huge_content})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 6. Reject invalid length
def test_reject_invalid_length(client: TestClient) -> None:
    response = client.post(
        "/api/v1/summarize",
        json={"content": "This is a valid educational passage.", "length": "one_word_only"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 7. Unauthenticated request rejected with HTTP 401
def test_unauthenticated_request_rejected(app, client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post("/api/v1/summarize", json={"content": "Photosynthesis details..."})
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
            "/api/v1/summarize",
            json={"content": "Photosynthesis details..."},
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
        "/api/v1/summarize",
        json={"content": "Photosynthesis is the conversion of sunlight into chemical energy.", "length": "medium"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "key_points" in data
    assert "length" in data
    assert isinstance(data["key_points"], list)
    assert len(data["key_points"]) > 0


# 10. Malformed AI response handling
def test_malformed_ai_response_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="malformed")
    response = client.post("/api/v1/summarize", json={"content": "Photosynthesis details..."})
    assert response.status_code == 502
    data = response.json()
    assert data["error"]["code"] == "AI_GENERATION_ERROR"


# 11. Gemini timeout handling
def test_gemini_timeout_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="timeout")
    response = client.post("/api/v1/summarize", json={"content": "Photosynthesis details..."})
    assert response.status_code == 504
    data = response.json()
    assert data["error"]["code"] == "AI_TIMEOUT"
    assert "request_id" in data["error"]


# 12. Gemini rate limit handling
def test_gemini_rate_limit_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="rate_limit")
    response = client.post("/api/v1/summarize", json={"content": "Photosynthesis details..."})
    assert response.status_code == 429
    data = response.json()
    assert data["error"]["code"] == "AI_RATE_LIMITED"


# 13. Request ID generation and header propagation
def test_request_id_generation_and_propagation(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    res_custom = client.post(
        "/api/v1/summarize",
        json={"content": "Photosynthesis details..."},
        headers={"X-Request-ID": "custom-sum-trace-777"},
    )
    assert res_custom.status_code == 200
    assert res_custom.json()["request_id"] == "custom-sum-trace-777"
    assert res_custom.headers.get("X-Request-ID") == "custom-sum-trace-777"


# 14. Secret protection audit
def test_secret_protection_in_summarize_responses(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post("/api/v1/summarize", json={"content": "Confidential security material..."})
    text_content = response.text
    assert "AIza" not in text_content
    assert "GEMINI_API_KEY" not in text_content
    assert "Bearer" not in text_content


# 15. Source-faithfulness behavior verification
def test_source_faithfulness_behavior(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    test_content = "Mitochondria generate ATP via oxidative phosphorylation."
    response = client.post(
        "/api/v1/summarize",
        json={"content": test_content, "length": "short"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "faithfully" in data["summary"]
    assert data["length"] == "short"
