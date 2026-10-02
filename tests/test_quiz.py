"""Automated tests for POST /api/v1/quiz endpoint covering Step 8 requirements."""

import pytest
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import (
    AIGenerationError,
    AIRateLimitError,
    AITimeoutError,
)
from app.schemas.quiz import QuizQuestionItem, QuizResponse
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
        if self.mode == "timeout":
            raise AITimeoutError("Gemini generation timed out after 30 seconds.")
        if self.mode == "rate_limit":
            raise AIRateLimitError("Gemini rate limit exceeded. Please try again shortly.")
        if self.mode == "malformed":
            raise AIGenerationError("Gemini output missing 'questions' in structured payload.")

        return QuizResponse(
            title="Photosynthesis Assessment",
            difficulty=difficulty,
            total_questions=3,
            questions=[
                QuizQuestionItem(
                    id="q1",
                    question="Which cellular organelle is the primary site of photosynthesis?",
                    options=["Mitochondria", "Chloroplast", "Ribosome", "Golgi apparatus"],
                    correct_answer="Chloroplast",
                    explanation="Chloroplasts contain chlorophyll pigments that absorb solar photons.",
                ),
                QuizQuestionItem(
                    id="q2",
                    question="What gas is released as an environmental byproduct during photosynthesis?",
                    options=["Carbon dioxide", "Nitrogen", "Oxygen", "Methane"],
                    correct_answer="Oxygen",
                    explanation="Water molecules are photolyzed during the light reactions, producing oxygen.",
                ),
                QuizQuestionItem(
                    id="q3",
                    question="What is the primary carbohydrate product produced by the Calvin cycle?",
                    options=["Glucose", "G3P", "Sucrose", "Cellulose"],
                    correct_answer="G3P",
                    explanation="Glyceraldehyde 3-phosphate (G3P) is the direct three-carbon sugar output.",
                ),
            ],
            model="gemini-3.1-flash-lite",
        )

    async def summarize_text(self, content, format, max_length_words=None):
        pass

    async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
        pass


# 1. Valid beginner quiz generation
def test_valid_beginner_quiz(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/quiz",
        json={
            "content": "Photosynthesis is the process by which green plants convert light energy into chemical energy.",
            "difficulty": "beginner",
        },
        headers={"X-Request-ID": "test-quiz-beg-101"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Photosynthesis Assessment"
    assert data["difficulty"] == "beginner"
    assert len(data["questions"]) == 3
    for q in data["questions"]:
        assert len(q["options"]) == 4
        assert q["correct_answer"] in q["options"]
        assert len(q["explanation"]) > 5
        assert q["correct_index"] is not None


# 2. Valid intermediate quiz generation
def test_valid_intermediate_quiz(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/quiz",
        json={
            "content": "REST APIs utilize HTTP methods like GET, POST, PUT, DELETE to manipulate stateful resources.",
            "difficulty": "intermediate",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["difficulty"] == "intermediate"
    assert len(data["questions"]) == 3


# 3. Valid advanced quiz generation
def test_valid_advanced_quiz(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/quiz",
        json={
            "content": "Binary search trees exhibit O(h) operations where h is height. AVL trees maintain balance invariant.",
            "difficulty": "advanced",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["difficulty"] == "advanced"
    assert len(data["questions"]) == 3


# 4. Reject empty content
def test_reject_empty_content(client: TestClient) -> None:
    # Empty string
    res_empty = client.post("/api/v1/quiz", json={"content": ""})
    assert res_empty.status_code == 422
    assert res_empty.json()["error"]["code"] == "VALIDATION_ERROR"

    # Whitespace only
    res_space = client.post("/api/v1/quiz", json={"content": "    \n   "})
    assert res_space.status_code == 422
    assert res_space.json()["error"]["code"] == "VALIDATION_ERROR"

    # Missing content
    res_none = client.post("/api/v1/quiz", json={})
    assert res_none.status_code == 422
    assert res_none.json()["error"]["code"] == "VALIDATION_ERROR"


# 5. Reject invalid difficulty
def test_reject_invalid_difficulty(client: TestClient) -> None:
    response = client.post(
        "/api/v1/quiz",
        json={"content": "Valid study text here...", "difficulty": "impossible_difficulty"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 6. Legacy difficulty tiers automatically map (easy -> beginner, medium -> intermediate, hard -> advanced)
def test_legacy_difficulty_mapping(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post(
        "/api/v1/quiz",
        json={"content": "Newton's laws of motion define classical mechanics...", "difficulty": "medium"},
    )
    assert response.status_code == 200
    assert response.json()["difficulty"] == "intermediate"


# 7. Unauthenticated request rejected with HTTP 401
def test_unauthenticated_request_rejected(app, client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post("/api/v1/quiz", json={"content": "Photosynthesis details..."})
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
            "/api/v1/quiz",
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


# 9. Gemini timeout handling
def test_gemini_timeout_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="timeout")
    response = client.post("/api/v1/quiz", json={"content": "Photosynthesis details..."})
    assert response.status_code == 504
    data = response.json()
    assert data["error"]["code"] == "AI_TIMEOUT"
    assert "request_id" in data["error"]


# 10. Gemini rate limit handling
def test_gemini_rate_limit_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="rate_limit")
    response = client.post("/api/v1/quiz", json={"content": "Photosynthesis details..."})
    assert response.status_code == 429
    data = response.json()
    assert data["error"]["code"] == "AI_RATE_LIMITED"


# 11. Malformed AI output handling
def test_malformed_ai_output_handled(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="malformed")
    response = client.post("/api/v1/quiz", json={"content": "Photosynthesis details..."})
    assert response.status_code == 502
    data = response.json()
    assert data["error"]["code"] == "AI_GENERATION_ERROR"


# 12. Request ID generation and header propagation
def test_request_id_generation_and_propagation(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    res_custom = client.post(
        "/api/v1/quiz",
        json={"content": "Photosynthesis details..."},
        headers={"X-Request-ID": "custom-quiz-trace-888"},
    )
    assert res_custom.status_code == 200
    assert res_custom.json()["request_id"] == "custom-quiz-trace-888"
    assert res_custom.headers.get("X-Request-ID") == "custom-quiz-trace-888"


# 13. Secret protection audit
def test_secret_protection_in_quiz_responses(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: DummyMockAIService(mode="success")
    response = client.post("/api/v1/quiz", json={"content": "Cybersecurity and cryptography..."})
    text_content = response.text
    assert "AIza" not in text_content
    assert "GEMINI_API_KEY" not in text_content
    assert "Bearer" not in text_content
