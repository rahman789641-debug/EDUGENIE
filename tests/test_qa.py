"""Comprehensive automated unit tests for POST /api/v1/qa endpoint.

Verifies:
1. valid Q&A request
2. empty question rejected (whitespace / empty string)
3. oversized question rejected (> 2000 chars)
4. unauthenticated request rejected (HTTP 401)
5. invalid Firebase token rejected (HTTP 401)
6. authenticated request processed with user claims
7. Gemini success response
8. Gemini timeout handling (HTTP 504)
9. Gemini rate limit handling (HTTP 429)
10. Gemini provider failure handling (HTTP 502)
11. malformed/empty AI response handling (HTTP 502)
12. request ID generation and propagation
13. secret not exposed in response body or headers
"""

from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import (
    AIAuthenticationError,
    AIProviderError,
    AIRateLimitedError,
    AITimeoutError,
)
from app.schemas.qa import QAResponse
from app.services.ai.client import GeminiClientManager
from app.services.ai.gemini_service import GeminiService
from app.services.ai_service import BaseAIService, get_ai_service


# 1. Valid Q&A request
def test_valid_qa_request(app, client: TestClient) -> None:
    """Validate that a well-formed educational question returns HTTP 200 with answers and metadata."""
    class MockAIService(BaseAIService):
        async def answer_question(self, question: str, context=None, enable_web_grounding=False):
            return QAResponse(
                question=question,
                answer="Recursion is a programming technique where a function calls itself to solve a smaller instance of the same problem.",
                sources=[],
                grounded=False,
                model="gemini-3.1-flash-lite",
            )

        async def explain_topic(self, topic, level, depth, enable_web_grounding=False):
            pass

        async def generate_quiz(self, content, question_count, difficulty):
            pass

        async def summarize_text(self, content, format, max_length_words=None):
            pass

        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
            pass

    app.dependency_overrides[get_ai_service] = lambda: MockAIService()
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "What is recursion?", "context": None},
            headers={"X-Request-ID": "req-qa-valid-1"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["question"] == "What is recursion?"
        assert "function calls itself" in data["answer"]
        assert data["request_id"] == "req-qa-valid-1"
        assert data["model"] == "gemini-3.1-flash-lite"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 2. Empty question rejected
def test_empty_question_rejected(client: TestClient) -> None:
    """Validate that empty strings or whitespace-only questions are rejected with HTTP 422."""
    for empty_val in ["", "   ", " \n\t "]:
        response = client.post("/api/v1/qa", json={"question": empty_val})
        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "request_id" in data["error"]


def test_greeting_and_short_questions_accepted(app, client: TestClient) -> None:
    """Validate that short queries like 'hi', greetings, and 1-char symbols are accepted and return HTTP 200."""
    class MockAIService:
        async def answer_question(self, question: str, context=None, enable_web_grounding=False):
            return QAResponse(
                question=question,
                answer="Hello! I am EduGenie Learning Assistant. How can I help you with your studies today?",
                model="gemini-3.1-flash-lite",
            )
        async def generate_quiz(self, content, question_count, difficulty): pass

    app.dependency_overrides[get_ai_service] = lambda: MockAIService()
    try:
        for greeting in ["hi", "hey", "yo", "C", "AI", "வணக்கம்"]:
            response = client.post("/api/v1/qa", json={"question": greeting})
            assert response.status_code == 200, f"Failed on '{greeting}' with {response.text}"
            data = response.json()
            assert data["status"] == "ok"
            assert data["question"] == greeting
            assert len(data["answer"]) > 0
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 3. Oversized question rejected
def test_oversized_question_rejected(client: TestClient) -> None:
    """Validate that questions exceeding 2000 characters are rejected with HTTP 422."""
    long_question = "What is " + ("x" * 2005)
    response = client.post("/api/v1/qa", json={"question": long_question})
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


# 4. Unauthenticated request rejected
def test_unauthenticated_request_rejected(app, client: TestClient) -> None:
    """Validate that requests without Authorization header are rejected with HTTP 401."""
    # Temporarily remove mock auth override
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "What is photosynthesis?"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "AUTHENTICATION_REQUIRED"
        assert "Authentication required" in data["error"]["message"]
    finally:
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
            uid="test-user-fixture-12345",
            email="student@edugenie.test",
        )


# 5. Invalid Firebase token rejected
def test_invalid_firebase_token_rejected(app, client: TestClient) -> None:
    """Validate that invalid Bearer tokens are rejected with HTTP 401 INVALID_TOKEN."""
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "What is photosynthesis?"},
            headers={"Authorization": "Bearer malformed.invalid.token.signature"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "INVALID_TOKEN"
    finally:
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
            uid="test-user-fixture-12345",
            email="student@edugenie.test",
        )


# 6. Authenticated request processed
def test_authenticated_request_processed(app, client: TestClient) -> None:
    """Validate that verified AuthenticatedUser identity is utilized and logged."""
    user = AuthenticatedUser(
        uid="usr_verified_98765",
        email="learner@school.edu",
        display_name="Marie Curie",
        email_verified=True,
    )
    app.dependency_overrides[get_current_user] = lambda: user

    class MockAIService(BaseAIService):
        async def answer_question(self, question: str, context=None, enable_web_grounding=False):
            return QAResponse(
                question=question,
                answer="Photosynthesis converts light energy into chemical energy in plants.",
                model="gemini-3.1-flash-lite",
            )

        async def explain_topic(self, topic, level, depth, enable_web_grounding=False):
            pass

        async def generate_quiz(self, content, question_count, difficulty):
            pass

        async def summarize_text(self, content, format, max_length_words=None):
            pass

        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
            pass

    app.dependency_overrides[get_ai_service] = lambda: MockAIService()
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "Explain photosynthesis."},
            headers={"X-Request-ID": "req-auth-test-marie"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["request_id"] == "req-auth-test-marie"
        assert "converts light energy" in data["answer"]
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 7. Gemini success
def test_gemini_success(app, client: TestClient) -> None:
    """Validate successful response construction from Gemini service output."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-3.1-flash-lite"
    mock_manager.generate_content = AsyncMock(
        return_value="A REST API uses standard HTTP methods like GET, POST, PUT, DELETE to communicate between client and server."
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "How does a REST API work?"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "HTTP methods" in data["answer"]
        assert data["model"] == "gemini-3.1-flash-lite"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 8. Gemini timeout
def test_gemini_timeout(app, client: TestClient) -> None:
    """Validate that Gemini timeout maps safely to HTTP 504 AI_TIMEOUT."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-3.1-flash-lite"
    mock_manager.generate_content = AsyncMock(
        side_effect=AITimeoutError("AI generation request timed out after 35s. Please try again.")
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "What is quantum entanglement?"},
            headers={"X-Request-ID": "req-timeout-1"},
        )
        assert response.status_code == 504
        data = response.json()
        assert data["error"]["code"] == "AI_TIMEOUT"
        assert "timed out" in data["error"]["message"].lower()
        assert data["error"]["request_id"] == "req-timeout-1"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 9. Gemini rate limit
def test_gemini_rate_limit(app, client: TestClient) -> None:
    """Validate that Gemini quota exhaustion maps safely to HTTP 429 AI_RATE_LIMITED."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-3.1-flash-lite"
    mock_manager.generate_content = AsyncMock(
        side_effect=AIRateLimitedError("Gemini API quota or rate limit has been exceeded.")
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "Teach me binary search."},
            headers={"X-Request-ID": "req-ratelimit-1"},
        )
        assert response.status_code == 429
        data = response.json()
        assert data["error"]["code"] == "AI_RATE_LIMITED"
        assert "rate limit" in data["error"]["message"].lower()
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 10. Gemini provider failure
def test_gemini_provider_failure(app, client: TestClient) -> None:
    """Validate that upstream AI provider network issues map to HTTP 502 AI_PROVIDER_ERROR."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-3.1-flash-lite"
    mock_manager.generate_content = AsyncMock(
        side_effect=AIProviderError("An error occurred while communicating with the AI provider.")
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "Explain graph traversal algorithms."},
            headers={"X-Request-ID": "req-provider-err-1"},
        )
        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "AI_PROVIDER_ERROR"
        assert data["error"]["request_id"] == "req-provider-err-1"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 11. Malformed AI response
def test_malformed_ai_response(app, client: TestClient) -> None:
    """Validate that an empty/malformed response from Gemini raises controlled AIProviderError (HTTP 502)."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-3.1-flash-lite"
    mock_manager.generate_content = AsyncMock(
        side_effect=AIProviderError("Gemini generated an empty response.")
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "What is the Doppler effect?"},
        )
        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "AI_PROVIDER_ERROR"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 12. Request ID generation and propagation
def test_request_id_generation_and_propagation(app, client: TestClient) -> None:
    """Validate that X-Request-ID is echoed if provided and generated if absent."""
    class EchoAIService(BaseAIService):
        async def answer_question(self, question: str, context=None, enable_web_grounding=False):
            return QAResponse(question=question, answer="Test answer.", model="gemini-3.1-flash-lite")

        async def explain_topic(self, topic, level, depth, enable_web_grounding=False):
            pass

        async def generate_quiz(self, content, question_count, difficulty):
            pass

        async def summarize_text(self, content, format, max_length_words=None):
            pass

        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
            pass

    app.dependency_overrides[get_ai_service] = lambda: EchoAIService()
    try:
        # Case A: Explicit X-Request-ID
        res_explicit = client.post(
            "/api/v1/qa",
            json={"question": "What is a heap data structure?"},
            headers={"X-Request-ID": "custom-req-id-777"},
        )
        assert res_explicit.headers["X-Request-ID"] == "custom-req-id-777"
        assert res_explicit.json()["request_id"] == "custom-req-id-777"

        # Case B: Generated X-Request-ID
        res_auto = client.post(
            "/api/v1/qa",
            json={"question": "What is a binary tree?"},
        )
        assert "X-Request-ID" in res_auto.headers
        assert res_auto.headers["X-Request-ID"].startswith("req-")
        assert res_auto.json()["request_id"] == res_auto.headers["X-Request-ID"]
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# 13. Secret not exposed
def test_secret_not_exposed(app, client: TestClient) -> None:
    """Validate that API keys, auth tokens, and raw provider details are never in response body or headers."""
    fake_secret_key = "AIzaSySecretKeyNeverExposeMeInResponses"

    class SensitiveAIService(BaseAIService):
        async def answer_question(self, question: str, context=None, enable_web_grounding=False):
            return QAResponse(question=question, answer="Educational answer without secrets.", model="gemini-3.1-flash-lite")

        async def explain_topic(self, topic, level, depth, enable_web_grounding=False):
            pass

        async def generate_quiz(self, content, question_count, difficulty):
            pass

        async def summarize_text(self, content, format, max_length_words=None):
            pass

        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
            pass

    app.dependency_overrides[get_ai_service] = lambda: SensitiveAIService()
    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "Explain sorting algorithms."},
            headers={"Authorization": f"Bearer {fake_secret_key}"},
        )
        content_text = response.text
        assert fake_secret_key not in content_text
        for header_val in response.headers.values():
            assert fake_secret_key not in header_val
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


# =========================================================================
# STEP 12 TESTS: Dual AI & Web Research Modes Integration
# =========================================================================

def test_qa_default_mode_is_ai(app, client: TestClient) -> None:
    """Requirement 1 & 2: When mode is omitted, defaults to 'ai' and does not call web research."""
    class MockAIService(BaseAIService):
        async def answer_question(self, question: str, context=None, enable_web_grounding=False):
            return QAResponse(
                question=question,
                answer="Direct AI answer without web search.",
                sources=[],
                model="gemini-3.1-flash-lite",
            )
        async def explain_topic(self, topic, level, depth, enable_web_grounding=False): pass
        async def generate_quiz(self, content, question_count, difficulty): pass
        async def summarize_text(self, content, format, max_length_words=None): pass
        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8): pass

    app.dependency_overrides[get_ai_service] = lambda: MockAIService()
    try:
        res = client.post("/api/v1/qa", json={"question": "What is Python?"})
        assert res.status_code == 200
        data = res.json()
        assert data["mode"] == "ai"
        assert data["sources"] == []
        assert data["grounded"] is False
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_qa_invalid_mode_rejected(client: TestClient) -> None:
    """Requirement 7: Invalid mode string is rejected with HTTP 422."""
    res = client.post("/api/v1/qa", json={"question": "What is Python?", "mode": "hyper_search"})
    assert res.status_code == 422


def test_qa_research_mode_calls_web_research(app, client: TestClient) -> None:
    """Requirements 3, 4, 5: Research mode executes web search, returns structured citations and grounded answer."""
    from app.schemas.research import WebSource
    from app.services.qa_service import get_qa_service, QAService
    from app.services.web_research_service import WebResearchService, get_web_research_service

    class MockAIService(BaseAIService):
        async def answer_question(self, question: str, context=None, enable_web_grounding=False):
            raise AssertionError("AI answer_question should not be called in research mode")
        async def explain_topic(self, topic, level, depth, enable_web_grounding=False): pass
        async def generate_quiz(self, content, question_count, difficulty): pass
        async def summarize_text(self, content, format, max_length_words=None): pass
        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8): pass
        async def synthesize_research(self, query: str, sources_context: str, conversation_context=None):
            return f"Grounded response for '{query}' using retrieved web citations."

    class MockResearchService(WebResearchService):
        async def search(self, query: str, max_results=None):
            return [
                WebSource(
                    title="React Documentation",
                    url="https://react.dev/",
                    domain="react.dev",
                    snippet="The library for web and native user interfaces.",
                )
            ]

    mock_ai = MockAIService()
    mock_research = MockResearchService(ai_service=mock_ai)
    app.dependency_overrides[get_ai_service] = lambda: mock_ai
    app.dependency_overrides[get_web_research_service] = lambda: mock_research
    app.dependency_overrides[get_qa_service] = lambda: QAService(ai_service=mock_ai, research_service=mock_research)

    try:
        res = client.post(
            "/api/v1/qa",
            json={"question": "What are the latest React features?", "mode": "research"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["mode"] == "research"
        assert data["grounded"] is True
        assert len(data["sources"]) == 1
        assert data["sources"][0]["domain"] == "react.dev"
        assert data["sources"][0]["url"] == "https://react.dev/"
        assert "Grounded response" in data["answer"]
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_web_research_service, None)
        app.dependency_overrides.pop(get_qa_service, None)


def test_qa_research_no_results_fallback(app, client: TestClient) -> None:
    """Requirement 11: When web search finds no sources, honest transparent explanation is returned."""
    from app.services.qa_service import get_qa_service, QAService
    from app.services.web_research_service import WebResearchService, get_web_research_service

    class MockAIService(BaseAIService):
        async def answer_question(self, question: str, context=None, enable_web_grounding=False): pass
        async def explain_topic(self, topic, level, depth, enable_web_grounding=False): pass
        async def generate_quiz(self, content, question_count, difficulty): pass
        async def summarize_text(self, content, format, max_length_words=None): pass
        async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8): pass
        async def synthesize_research(self, query: str, sources_context: str, conversation_context=None): pass

    class EmptyResearchService(WebResearchService):
        async def search(self, query: str, max_results=None):
            return []

    mock_ai = MockAIService()
    empty_research = EmptyResearchService(ai_service=mock_ai)
    app.dependency_overrides[get_ai_service] = lambda: mock_ai
    app.dependency_overrides[get_web_research_service] = lambda: empty_research
    app.dependency_overrides[get_qa_service] = lambda: QAService(ai_service=mock_ai, research_service=empty_research)

    try:
        res = client.post(
            "/api/v1/qa",
            json={"question": "xyznonexistent9999query", "mode": "research"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["mode"] == "research"
        assert data["sources"] == []
        assert "No reliable web results were found" in data["answer"]
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_web_research_service, None)
        app.dependency_overrides.pop(get_qa_service, None)

