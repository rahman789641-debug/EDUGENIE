"""Automated tests for POST /api/v1/learn/recommendations endpoint covering Step 10 requirements."""

import pytest
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import (
    AIGenerationError,
    AIRateLimitError,
    AITimeoutError,
)
from app.schemas.learning_path import (
    LearningPathResponse,
    LearningResource,
    LearningStage,
    MilestoneStage,
)
from app.services.ai.base import BaseAIService
from app.services.ai_service import get_ai_service


class MockLearningPathAIService(BaseAIService):
    """Controlled mock AI service simulating Gemini responses without quota consumption."""

    def __init__(self, mode: str = "success") -> None:
        super().__init__(service_name="MockLearningPathAIService")
        self.mode = mode

    async def answer_question(self, question, context=None, enable_web_grounding=False):
        pass

    async def explain_topic(self, topic, level="beginner", depth="standard", enable_web_grounding=False):
        pass

    async def generate_quiz(self, content, question_count=3, difficulty="beginner"):
        pass

    async def summarize_text(self, content, length="medium", format="bullet_points", max_length_words=None):
        pass

    async def generate_learning_path(
        self,
        topic: str,
        current_level: str,
        target_goal=None,
        duration_weeks=8,
    ) -> LearningPathResponse:
        if self.mode == "timeout":
            raise AITimeoutError("Gemini generation timed out after 30 seconds.")
        if self.mode == "rate_limit":
            raise AIRateLimitError("Gemini rate limit exceeded. Please try again shortly.")
        if self.mode == "malformed":
            raise AIGenerationError("Gemini output missing valid stages array.")

        stages = [
            LearningStage(
                stage=1,
                title=f"{topic} Foundations" if current_level == "beginner" else f"{topic} Core Systems",
                difficulty=current_level,
                concepts=[f"{topic} syntax", "Control flow", "Memory basics"],
                practice=["Solve 5 exercises", "Build simple CLI tool"],
                resources=[
                    LearningResource(type="documentation", title=f"Official {topic} Documentation", url=None),
                    LearningResource(type="book", title=f"Learning {topic} Thoroughly", url=None),
                ],
                checkpoint_project="Build a console project",
            ),
            LearningStage(
                stage=2,
                title=f"{topic} Applied Implementation ({target_goal or 'General'})",
                difficulty="intermediate" if current_level == "beginner" else "advanced",
                concepts=["Design patterns", "Concurrency", "API integration"],
                practice=["Build full-stack feature", "Write integration tests"],
                resources=[
                    LearningResource(type="article", title=f"Architectural Patterns in {topic}", url=None),
                ],
                checkpoint_project="Deploy functional microservice",
            ),
        ]

        return LearningPathResponse(
            status="ok",
            topic=topic,
            level=current_level,
            goal=target_goal,
            overview=f"Comprehensive roadmap for mastering {topic} tailored to goal: {target_goal or 'General'}",
            stages=stages,
            milestones=stages,
            total_stages=len(stages),
            next_steps=["Contribute to open source", "Publish portfolio project"],
            model="gemini-3.1-flash-lite",
        )


# 1. Valid beginner learning path
def test_valid_beginner_learning_path(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="success")
    response = client.post(
        "/api/v1/learn/recommendations",
        json={"topic": "Python Programming", "level": "beginner", "goal": "Become a backend developer"},
        headers={"X-Request-ID": "test-req-lp-001"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Python Programming"
    assert data["level"] == "beginner"
    assert data["goal"] == "Become a backend developer"
    assert len(data["stages"]) >= 2
    assert data["stages"][0]["difficulty"] == "beginner"
    assert data["stages"][0]["stage"] == 1
    assert len(data["stages"][0]["concepts"]) > 0
    assert len(data["stages"][0]["practice"]) > 0
    assert len(data["stages"][0]["resources"]) > 0
    assert data["stages"][0]["resources"][0]["url"] is None
    assert data["request_id"] == "test-req-lp-001"


# 2. Valid intermediate learning path
def test_valid_intermediate_learning_path(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="success")
    response = client.post(
        "/api/v1/learn/recommendations",
        json={"topic": "Machine Learning", "level": "intermediate", "goal": "Build practical ML projects"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Machine Learning"
    assert data["level"] == "intermediate"
    assert data["stages"][0]["difficulty"] == "intermediate"


# 3. Valid advanced learning path
def test_valid_advanced_learning_path(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="success")
    response = client.post(
        "/api/v1/learn/recommendations",
        json={"topic": "Distributed Systems", "level": "advanced"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Distributed Systems"
    assert data["level"] == "advanced"
    assert data["stages"][0]["difficulty"] == "advanced"


# 4. Reject empty topic
def test_learning_path_rejects_empty_topic(client: TestClient) -> None:
    response = client.post("/api/v1/learn/recommendations", json={"topic": ""})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 5. Reject oversized topic
def test_learning_path_rejects_oversized_topic(client: TestClient) -> None:
    huge_topic = "A" * 501
    response = client.post("/api/v1/learn/recommendations", json={"topic": huge_topic})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 6. Reject invalid duration
def test_learning_path_rejects_invalid_duration(client: TestClient) -> None:
    response = client.post(
        "/api/v1/learn/recommendations",
        json={"topic": "Python Programming", "duration_weeks": 100},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 7. Unauthenticated request rejected with HTTP 401
def test_learning_path_unauthenticated_request_rejected(app, client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post("/api/v1/learn/recommendations", json={"topic": "Python"})
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
def test_learning_path_invalid_token_rejected(app, client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post(
            "/api/v1/learn/recommendations",
            json={"topic": "Python"},
            headers={"Authorization": "Bearer bad.token.here"},
        )
        assert response.status_code == 401
    finally:
        mock_user = AuthenticatedUser(
            uid="test-student-uid-12345",
            email="student@edugenie.test",
            display_name="Test Student",
            email_verified=True,
            claims={"uid": "test-student-uid-12345", "email": "student@edugenie.test"},
        )
        app.dependency_overrides[get_current_user] = lambda: mock_user


# 9. Gemini timeout maps to 504
def test_learning_path_gemini_timeout(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="timeout")
    response = client.post("/api/v1/learn/recommendations", json={"topic": "Python"})
    assert response.status_code == 504
    data = response.json()
    assert data["error"]["code"] == "AI_TIMEOUT"


# 10. Gemini rate limit maps to 429
def test_learning_path_gemini_rate_limit(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="rate_limit")
    response = client.post("/api/v1/learn/recommendations", json={"topic": "Python"})
    assert response.status_code == 429
    data = response.json()
    assert data["error"]["code"] == "AI_RATE_LIMITED"


# 11. Malformed JSON maps to 502
def test_learning_path_malformed_json(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="malformed")
    response = client.post("/api/v1/learn/recommendations", json={"topic": "Python"})
    assert response.status_code == 502
    data = response.json()
    assert data["error"]["code"] == "AI_GENERATION_ERROR"


# 12. Fake URL protection (enforces null url)
def test_learning_path_fake_url_protection(app, client: TestClient) -> None:
    class MaliciousUrlAIService(BaseAIService):
        async def answer_question(self, question, context=None, enable_web_grounding=False): pass
        async def explain_topic(self, topic, level="beginner", depth="standard", enable_web_grounding=False): pass
        async def generate_quiz(self, content, question_count=3, difficulty="beginner"): pass
        async def summarize_text(self, content, length="medium", format="bullet_points", max_length_words=None): pass
        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
            return LearningPathResponse(
                topic=topic,
                level=current_level,
                stages=[
                    LearningStage(
                        stage=1,
                        title="Fake Resource Stage",
                        concepts=["Concept"],
                        practice=["Practice"],
                        resources=[
                            LearningResource(type="book", title="Fake Book", url="https://fake-phishing-url.com/book"),
                            LearningResource(type="documentation", title="Doc", url="https://example.com/fake"),
                        ],
                    )
                ],
            )

    app.dependency_overrides[get_ai_service] = lambda: MaliciousUrlAIService()
    response = client.post("/api/v1/learn/recommendations", json={"topic": "Security"})
    assert response.status_code == 200
    data = response.json()
    for res in data["stages"][0]["resources"]:
        assert res["url"] is None, f"Resource URL was not sanitized: {res['url']}"


# 13. Dual endpoint compatibility (/learning-path alias)
def test_learning_path_alias_endpoint(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="success")
    response = client.post(
        "/api/v1/learning-path",
        json={"topic": "Python Programming", "level": "beginner"},
        headers={"X-Request-ID": "test-alias-req"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Python Programming"
    assert data["request_id"] == "test-alias-req"


# 14. Backward compatibility with legacy fields (milestones, stage_number, focus_concepts)
def test_learning_path_legacy_fields_compatibility(app, client: TestClient) -> None:
    app.dependency_overrides[get_ai_service] = lambda: MockLearningPathAIService(mode="success")
    response = client.post("/api/v1/learn/recommendations", json={"topic": "Python"})
    assert response.status_code == 200
    data = response.json()
    assert "milestones" in data
    assert "stages" in data
    assert len(data["milestones"]) == len(data["stages"])
    assert data["milestones"][0]["stage_number"] == 1
    assert "focus_concepts" in data["milestones"][0]
