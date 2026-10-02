"""Automated tests for POST /api/v1/research endpoint covering Step 11 requirements."""

import pytest
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import (
    AIGenerationError,
    AIRateLimitError,
    AITimeoutError,
)
from app.schemas.research import WebSource
from app.services.ai.base import BaseAIService
from app.services.ai_service import get_ai_service
from app.services.web_research_service import WebResearchService, get_web_research_service


class DummyMockAIService(BaseAIService):
    """Controlled mock AI service simulating Gemini research synthesis without quota consumption."""

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
        pass

    async def generate_learning_path(self, topic, current_level, target_goal=None, duration_weeks=8):
        pass

    async def synthesize_research(self, query: str, sources_context: str) -> str:
        if self.mode == "timeout":
            raise AITimeoutError("Gemini generation timed out after 30 seconds.")
        if self.mode == "rate_limit":
            raise AIRateLimitError("Gemini rate limit exceeded. Please try again shortly.")
        if self.mode == "error":
            raise AIGenerationError("Gemini research synthesis failed.")
        return f"Synthesized educational answer for '{query}' grounded strictly in the provided sources."


class MockWebResearchService(WebResearchService):
    """Controlled research service mocking search outputs."""

    def __init__(self, ai_service: BaseAIService, mock_sources=None) -> None:
        super().__init__(ai_service=ai_service)
        self.mock_sources = mock_sources

    async def search(self, query: str, max_results=None):
        if self.mock_sources is not None:
            return self.mock_sources
        return [
            WebSource(
                title="Python Official Documentation",
                url="https://docs.python.org/3/",
                domain="docs.python.org",
                snippet="The official Python programming language documentation and release notes.",
            ),
            WebSource(
                title="Python Enhancement Proposals",
                url="https://peps.python.org/",
                domain="peps.python.org",
                snippet="PEP index covering recent language specifications and features.",
            ),
        ]


def test_research_success(client: TestClient, app):
    """Test successful web research with grounded response and citations."""
    mock_ai = DummyMockAIService(mode="success")
    app.dependency_overrides[get_ai_service] = lambda: mock_ai
    app.dependency_overrides[get_web_research_service] = lambda: MockWebResearchService(ai_service=mock_ai)

    try:
        response = client.post(
            "/api/v1/research",
            json={"query": "What are the latest official developments in Python?"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "What are the latest official developments in Python?"
        assert "Python" in data["answer"]
        assert len(data["sources"]) == 2
        assert data["sources"][0]["domain"] == "docs.python.org"
        assert data["sources"][0]["url"] == "https://docs.python.org/3/"
        assert data["searched"] is True
        assert data["status"] == "ok"
        assert "request_id" in data
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_web_research_service, None)


def test_research_empty_query(client: TestClient):
    """Test validation rejection for empty or whitespace-only query."""
    resp = client.post("/api/v1/research", json={"query": ""})
    assert resp.status_code == 422

    resp_ws = client.post("/api/v1/research", json={"query": "    "})
    assert resp_ws.status_code == 422


def test_research_query_too_short(client: TestClient):
    """Test validation rejection for query shorter than 2 characters."""
    resp = client.post("/api/v1/research", json={"query": "a"})
    assert resp.status_code == 422


def test_research_query_too_long(client: TestClient):
    """Test validation rejection for query longer than 1000 characters."""
    oversized = "python " * 200  # > 1000 chars
    resp = client.post("/api/v1/research", json={"query": oversized})
    assert resp.status_code == 422


def test_research_unauthenticated(client: TestClient, app):
    """Test rejection when user is unauthenticated."""
    app.dependency_overrides.pop(get_current_user, None)

    try:
        response = client.post(
            "/api/v1/research",
            json={"query": "What is Python?"},
        )
        assert response.status_code == 401
    finally:
        # Re-attach default mock user
        mock_user = AuthenticatedUser(
            uid="test-student-uid-12345",
            email="student@edugenie.test",
            display_name="Test Student",
            email_verified=True,
            claims={"uid": "test-student-uid-12345", "email": "student@edugenie.test"},
        )
        app.dependency_overrides[get_current_user] = lambda: mock_user


def test_research_no_sources_fallback(client: TestClient, app):
    """Test anti-hallucination fallback when external search yields zero results."""
    mock_ai = DummyMockAIService(mode="success")
    app.dependency_overrides[get_ai_service] = lambda: mock_ai
    app.dependency_overrides[get_web_research_service] = lambda: MockWebResearchService(
        ai_service=mock_ai,
        mock_sources=[],
    )

    try:
        response = client.post(
            "/api/v1/research",
            json={"query": "qwertyuiopasdfghjkl123456789xyz"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["sources"] == []
        assert "No reliable external web results were found" in data["answer"]
        assert data["searched"] is True
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_web_research_service, None)


def test_research_gemini_timeout(client: TestClient, app):
    """Test 504 Gateway Timeout when Gemini times out during synthesis."""
    mock_ai = DummyMockAIService(mode="timeout")
    app.dependency_overrides[get_ai_service] = lambda: mock_ai
    app.dependency_overrides[get_web_research_service] = lambda: MockWebResearchService(ai_service=mock_ai)

    try:
        response = client.post(
            "/api/v1/research",
            json={"query": "Explain quantum computing advances"},
        )
        assert response.status_code == 504
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "AI_TIMEOUT"

    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_web_research_service, None)


def test_research_gemini_rate_limit(client: TestClient, app):
    """Test 429 Too Many Requests when Gemini rate limit is encountered."""
    mock_ai = DummyMockAIService(mode="rate_limit")
    app.dependency_overrides[get_ai_service] = lambda: mock_ai
    app.dependency_overrides[get_web_research_service] = lambda: MockWebResearchService(ai_service=mock_ai)

    try:
        response = client.post(
            "/api/v1/research",
            json={"query": "Explain quantum computing advances"},
        )
        assert response.status_code == 429
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_web_research_service, None)


def test_research_gemini_provider_error(client: TestClient, app):
    """Test 502 Bad Gateway when Gemini service fails."""
    mock_ai = DummyMockAIService(mode="error")
    app.dependency_overrides[get_ai_service] = lambda: mock_ai
    app.dependency_overrides[get_web_research_service] = lambda: MockWebResearchService(ai_service=mock_ai)

    try:
        response = client.post(
            "/api/v1/research",
            json={"query": "Explain quantum computing advances"},
        )
        assert response.status_code == 502
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_web_research_service, None)


def test_research_url_extractor():
    """Test internal URL extractor resolving DuckDuckGo redirect parameters."""
    mock_ai = DummyMockAIService()
    service = WebResearchService(ai_service=mock_ai)

    # 1. Standard DuckDuckGo redirect
    ddg_url = "//duckduckgo.com/l/?uddg=https%3A%2F%2Freact.dev%2Freference%2Frsc&rut=xyz"
    extracted = service._extract_url(ddg_url)
    assert extracted == "https://react.dev/reference/rsc"

    # 2. Direct HTTPS URL
    direct = "https://fastapi.tiangolo.com/"
    assert service._extract_url(direct) == direct

    # 3. DuckDuckGo internal site search ignore
    assert service._extract_url("https://duckduckgo.com/?q=test") is None
