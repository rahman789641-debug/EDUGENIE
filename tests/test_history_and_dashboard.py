"""Automated test suite for STEP 14: User Data, Learning History & Dashboard Intelligence."""

import pytest
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.repositories import get_activity_repository
from app.repositories.sqlite_activity_repository import SQLiteActivityRepository
from app.schemas.activity import ActivityCreate, ActivityType
from app.schemas.explain import ExplainResponse
from app.schemas.quiz import QuizQuestionItem, QuizResponse
from app.services.activity_service import get_activity_service
from app.services.ai.base import BaseAIService
from app.services.ai_service import get_ai_service


@pytest.fixture
def memory_repo():
    """Isolated in-memory repository for test cases."""
    return SQLiteActivityRepository(db_path=":memory:")


# ---------------------------------------------------------------------------
# 1. Unauthenticated Request Rejection Tests (HTTP 401)
# ---------------------------------------------------------------------------
def test_unauthenticated_history_returns_401(app, client: TestClient):
    """Verify GET /api/v1/history returns 401 when no authenticated user is present."""
    app.dependency_overrides.pop(get_current_user, None)
    response = client.get("/api/v1/history")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] in ("AUTHENTICATION_REQUIRED", "HTTP_401")


def test_unauthenticated_dashboard_stats_returns_401(app, client: TestClient):
    """Verify GET /api/v1/dashboard/stats returns 401 when unauthenticated."""
    app.dependency_overrides.pop(get_current_user, None)
    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] in ("AUTHENTICATION_REQUIRED", "HTTP_401")


# ---------------------------------------------------------------------------
# 2. Multi-User Isolation Tests (User A vs User B)
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_multi_user_isolation(app, client: TestClient, memory_repo):
    """CRITICAL SECURITY TEST: Verify User A cannot see User B's learning history."""
    # Populate memory repo with activities for User A and User B
    user_a_uid = "firebase_user_A_111"
    user_b_uid = "firebase_user_B_222"

    await memory_repo.record_activity(
        ActivityCreate(
            user_id=user_a_uid,
            activity_type=ActivityType.QA,
            title="User A Question on React",
        )
    )
    await memory_repo.record_activity(
        ActivityCreate(
            user_id=user_b_uid,
            activity_type=ActivityType.QUIZ,
            title="User B Quiz on Python",
        )
    )

    app.dependency_overrides[get_activity_repository] = lambda: memory_repo

    # 1. Request as User A
    user_a = AuthenticatedUser(
        uid=user_a_uid,
        email="usera@test.com",
        display_name="User A",
        email_verified=True,
    )
    app.dependency_overrides[get_current_user] = lambda: user_a

    resp_a = client.get("/api/v1/history")
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["total"] == 1
    assert data_a["items"][0]["title"] == "User A Question on React"
    assert data_a["items"][0]["user_id"] == user_a_uid

    # 2. Request as User B
    user_b = AuthenticatedUser(
        uid=user_b_uid,
        email="userb@test.com",
        display_name="User B",
        email_verified=True,
    )
    app.dependency_overrides[get_current_user] = lambda: user_b

    resp_b = client.get("/api/v1/history")
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["total"] == 1
    assert data_b["items"][0]["title"] == "User B Quiz on Python"
    assert data_b["items"][0]["user_id"] == user_b_uid

    # Verify User A cannot access User B data via query params or hacks
    resp_hack = client.get(f"/api/v1/history?user_id={user_b_uid}")
    assert resp_hack.status_code == 200
    data_hack = resp_hack.json()
    # Still only returns User B's own data since user_b is the auth identity
    assert all(item["user_id"] == user_b_uid for item in data_hack["items"])


# ---------------------------------------------------------------------------
# 3. Empty History Tests
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_empty_history_returns_valid_structure(app, client: TestClient, memory_repo):
    """Verify new user with 0 activities gets valid 200 response with empty items."""
    new_user = AuthenticatedUser(
        uid="brand_new_user_999",
        email="newbie@test.com",
        display_name="New Student",
        email_verified=True,
    )
    app.dependency_overrides[get_current_user] = lambda: new_user
    app.dependency_overrides[get_activity_repository] = lambda: memory_repo

    response = client.get("/api/v1/history")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["total_pages"] == 0
    assert data["page"] == 1
    assert data["page_size"] == 20


# ---------------------------------------------------------------------------
# 4. Pagination & Query Parameter Validation Tests
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_history_pagination(app, client: TestClient, memory_repo):
    """Verify history pagination works with custom page and page_size."""
    user_uid = "pagination_tester_uid"
    user = AuthenticatedUser(uid=user_uid, email="pag@test.com", email_verified=True)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_activity_repository] = lambda: memory_repo

    # Insert 15 items
    for i in range(1, 16):
        await memory_repo.record_activity(
            ActivityCreate(
                user_id=user_uid,
                activity_type=ActivityType.QA,
                title=f"Activity Number {i}",
            )
        )

    # Page 1 with size 5
    resp1 = client.get("/api/v1/history?page=1&page_size=5")
    assert resp1.status_code == 200
    d1 = resp1.json()
    assert len(d1["items"]) == 5
    assert d1["total"] == 15
    assert d1["total_pages"] == 3
    assert d1["page"] == 1

    # Page 3 with size 5
    resp3 = client.get("/api/v1/history?page=3&page_size=5")
    assert resp3.status_code == 200
    d3 = resp3.json()
    assert len(d3["items"]) == 5
    assert d3["page"] == 3


def test_history_invalid_query_parameters(app, client: TestClient):
    """Verify invalid page or page_size values are rejected with 400 or 422."""
    user = AuthenticatedUser(uid="param_tester", email="param@test.com", email_verified=True)
    app.dependency_overrides[get_current_user] = lambda: user

    # Page 0 is invalid
    res_p0 = client.get("/api/v1/history?page=0")
    assert res_p0.status_code in (400, 422)

    # Page size > 100 is invalid
    res_large = client.get("/api/v1/history?page_size=101")
    assert res_large.status_code in (400, 422)

    # Invalid activity type
    res_type = client.get("/api/v1/history?activity_type=invalid_type_xyz")
    assert res_type.status_code == 400
    assert "Invalid activity_type" in res_type.json()["error"]["message"]


# ---------------------------------------------------------------------------
# 5. Activity Type Filter Tests
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_history_activity_type_filters(app, client: TestClient, memory_repo):
    """Verify filtering by activity_type returns only matching records."""
    user_uid = "filter_tester_uid"
    user = AuthenticatedUser(uid=user_uid, email="filter@test.com", email_verified=True)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_activity_repository] = lambda: memory_repo

    await memory_repo.record_activity(
        ActivityCreate(user_id=user_uid, activity_type=ActivityType.QA, title="QA Item 1")
    )
    await memory_repo.record_activity(
        ActivityCreate(user_id=user_uid, activity_type=ActivityType.QUIZ, title="Quiz Item 1")
    )
    await memory_repo.record_activity(
        ActivityCreate(user_id=user_uid, activity_type=ActivityType.QUIZ, title="Quiz Item 2")
    )
    await memory_repo.record_activity(
        ActivityCreate(user_id=user_uid, activity_type=ActivityType.EXPLAIN, title="Explain Item 1")
    )

    # Filter for quiz
    resp_quiz = client.get("/api/v1/history?activity_type=quiz")
    assert resp_quiz.status_code == 200
    data_quiz = resp_quiz.json()
    assert data_quiz["total"] == 2
    assert all(item["activity_type"] == "quiz" for item in data_quiz["items"])

    # Filter for qa
    resp_qa = client.get("/api/v1/history?activity_type=qa")
    assert resp_qa.status_code == 200
    data_qa = resp_qa.json()
    assert data_qa["total"] == 1
    assert data_qa["items"][0]["activity_type"] == "qa"


# ---------------------------------------------------------------------------
# 6. Dashboard Statistics Tests
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_dashboard_statistics_calculation(app, client: TestClient, memory_repo):
    """Verify dashboard stats aggregate correctly for authenticated user."""
    user_uid = "stats_tester_uid"
    user = AuthenticatedUser(uid=user_uid, email="stats@test.com", email_verified=True)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_activity_repository] = lambda: memory_repo

    # Empty stats first
    resp_empty = client.get("/api/v1/dashboard/stats")
    assert resp_empty.status_code == 200
    d_empty = resp_empty.json()
    assert d_empty["total_activities"] == 0
    assert d_empty["questions_asked"] == 0
    assert d_empty["quizzes_completed"] == 0
    assert d_empty["recent_activities"] == []

    # Insert diverse activities
    await memory_repo.record_activity(ActivityCreate(user_id=user_uid, activity_type=ActivityType.QA, title="Q1"))
    await memory_repo.record_activity(ActivityCreate(user_id=user_uid, activity_type=ActivityType.QA, title="Q2"))
    await memory_repo.record_activity(ActivityCreate(user_id=user_uid, activity_type=ActivityType.QUIZ, title="Quiz 1"))
    await memory_repo.record_activity(ActivityCreate(user_id=user_uid, activity_type=ActivityType.EXPLAIN, title="Explain 1"))
    await memory_repo.record_activity(ActivityCreate(user_id=user_uid, activity_type=ActivityType.SUMMARIZE, title="Sum 1"))
    await memory_repo.record_activity(ActivityCreate(user_id=user_uid, activity_type=ActivityType.LEARNING_PATH, title="LP 1"))
    await memory_repo.record_activity(ActivityCreate(user_id=user_uid, activity_type=ActivityType.RESEARCH, title="Res 1"))

    # Fetch stats
    resp_populated = client.get("/api/v1/dashboard/stats")
    assert resp_populated.status_code == 200
    stats = resp_populated.json()
    assert stats["total_activities"] == 7
    assert stats["questions_asked"] == 2
    assert stats["quizzes_completed"] == 1
    assert stats["explanations_generated"] == 1
    assert stats["summaries_generated"] == 1
    assert stats["learning_paths_generated"] == 1
    assert stats["research_queries"] == 1
    assert len(stats["recent_activities"]) == 5  # Top 5 newest


# ---------------------------------------------------------------------------
# 7. AI Success Auto-Recording vs Failure Non-Recording Tests
# ---------------------------------------------------------------------------
from app.core.exceptions import AIGenerationError


class MockAIServiceForRecording(BaseAIService):
    """Mock AI Service for testing success recording and failure non-recording."""

    def __init__(self, should_fail: bool = False):
        super().__init__(service_name="MockAI")
        self.should_fail = should_fail

    async def answer_question(self, question, context=None, enable_web_grounding=False):
        pass

    async def explain_topic(self, topic, level="beginner", depth="standard", enable_web_grounding=False):
        if self.should_fail:
            raise AIGenerationError("Upstream AI failure simulation")
        return ExplainResponse(
            topic=topic,
            level=level,
            title=f"Understanding {topic}",
            explanation="Educational text",
            key_points=["Point 1"],
            example="Example",
            model="gemini-mock",
        )

    async def generate_quiz(self, content, question_count=3, difficulty="beginner"):
        if self.should_fail:
            raise AIGenerationError("Upstream AI failure simulation")

        return QuizResponse(
            title="Auto Quiz",
            difficulty=difficulty,
            total_questions=1,
            questions=[
                QuizQuestionItem(
                    id="q1",
                    question="Sample?",
                    options=["A", "B", "C", "D"],
                    correct_answer="A",
                    explanation="Reason",
                )
            ],
            model="gemini-mock",
        )

    async def summarize_text(self, content, length="medium", format="bullet_points", max_length_words=None):
        pass

    async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
        pass


@pytest.mark.anyio
async def test_successful_ai_request_records_activity(app, client: TestClient, memory_repo):
    """Verify that successful AI requests automatically record learning activities."""
    user_uid = "recorder_success_user"
    user = AuthenticatedUser(uid=user_uid, email="recorder@test.com", email_verified=True)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_activity_repository] = lambda: memory_repo
    app.dependency_overrides[get_ai_service] = lambda: MockAIServiceForRecording(should_fail=False)

    # Call /api/v1/explain
    resp = client.post("/api/v1/explain", json={"topic": "Quantum Computing", "level": "beginner"})
    assert resp.status_code == 200

    # Verify history recorded
    hist_resp = client.get("/api/v1/history")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert hist["total"] == 1
    assert hist["items"][0]["activity_type"] == "explain"
    assert "Quantum Computing" in hist["items"][0]["title"]


@pytest.mark.anyio
async def test_failed_ai_request_does_not_record_activity(app, client: TestClient, memory_repo):
    """Verify that failed AI requests do NOT write any activity record."""
    user_uid = "recorder_failure_user"
    user = AuthenticatedUser(uid=user_uid, email="fail_rec@test.com", email_verified=True)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_activity_repository] = lambda: memory_repo
    app.dependency_overrides[get_ai_service] = lambda: MockAIServiceForRecording(should_fail=True)

    # Call /api/v1/explain with failure
    resp = client.post("/api/v1/explain", json={"topic": "Black Holes", "level": "beginner"})
    assert resp.status_code == 502

    # Verify NO activity was recorded
    hist_resp = client.get("/api/v1/history")
    assert hist_resp.status_code == 200
    assert hist_resp.json()["total"] == 0


# ---------------------------------------------------------------------------
# 7. Delete History Item Endpoint Tests
# ---------------------------------------------------------------------------
def test_unauthenticated_delete_history_returns_401(app, client: TestClient):
    """Verify DELETE /api/v1/history/{id} returns 401 when unauthenticated."""
    app.dependency_overrides.pop(get_current_user, None)
    response = client.delete("/api/v1/history/some_id_123")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] in ("AUTHENTICATION_REQUIRED", "HTTP_401")


@pytest.mark.anyio
async def test_delete_history_item_success_and_isolation(app, client: TestClient, memory_repo):
    """Verify user can delete their own activity item, but cannot delete another user's item."""
    user_a = AuthenticatedUser(uid="user_del_A", email="a@test.com", email_verified=True)
    user_b = AuthenticatedUser(uid="user_del_B", email="b@test.com", email_verified=True)

    app.dependency_overrides[get_activity_repository] = lambda: memory_repo

    # Create item for User A
    item_a = await memory_repo.record_activity(
        ActivityCreate(
            user_id="user_del_A",
            activity_type=ActivityType.QA,
            title="Chat to Delete",
            input_snippet="What is AI?",
        )
    )

    # User B attempts to delete User A's item -> 404 (strictly isolated)
    app.dependency_overrides[get_current_user] = lambda: user_b
    del_fail_resp = client.delete(f"/api/v1/history/{item_a.id}")
    assert del_fail_resp.status_code == 404

    # User A deletes their own item -> 200
    app.dependency_overrides[get_current_user] = lambda: user_a
    del_ok_resp = client.delete(f"/api/v1/history/{item_a.id}")
    assert del_ok_resp.status_code == 200
    assert del_ok_resp.json() == {"status": "ok", "deleted": True, "activity_id": item_a.id}

    # Verify item is gone from User A's history
    hist_resp = client.get("/api/v1/history")
    assert hist_resp.status_code == 200
    assert hist_resp.json()["total"] == 0

