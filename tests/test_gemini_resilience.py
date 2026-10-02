"""Automated tests for Gemini client resilience, error mapping, timeouts, and secret safety."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.exceptions import (
    AIAuthenticationError,
    AIConfigurationError,
    AIGenerationError,
    AIProviderError,
    AIRateLimitedError,
    AITimeoutError,
)
from app.services.ai.client import GeminiClientManager
from app.services.ai.gemini_service import GeminiService, extract_json_from_ai_text
from app.services.ai_service import get_ai_service


def test_gemini_timeout_mapping_and_handling(app, client: TestClient) -> None:
    """Validate that Gemini timeout produces HTTP 504 with AI_TIMEOUT code."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-2.5-flash"
    mock_manager.generate_content = AsyncMock(
        side_effect=AITimeoutError("AI generation request timed out after 30s. Please try again.")
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service

    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "What is quantum entanglement?"},
            headers={"X-Request-ID": "test-timeout-req-1"},
        )
        assert response.status_code == 504
        data = response.json()
        assert data["error"]["code"] == "AI_TIMEOUT"
        assert "timed out" in data["error"]["message"].lower()
        assert data["error"]["request_id"] == "test-timeout-req-1"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_gemini_authentication_failure_handling(app, client: TestClient) -> None:
    """Validate that Gemini 403/401 permission errors map to HTTP 502 AI_AUTHENTICATION_ERROR."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-2.5-flash"
    mock_manager.generate_content = AsyncMock(
        side_effect=AIAuthenticationError(
            "Gemini API authentication failed. Please verify API key configuration and service permissions."
        )
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service

    try:
        response = client.post(
            "/api/v1/explain",
            json={"topic": "Black Holes", "level": "undergraduate"},
            headers={"X-Request-ID": "test-auth-fail-req"},
        )
        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "AI_AUTHENTICATION_ERROR"
        assert "authentication failed" in data["error"]["message"].lower()
        assert data["error"]["request_id"] == "test-auth-fail-req"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_gemini_rate_limited_handling(app, client: TestClient) -> None:
    """Validate that quota exhaustion produces HTTP 429 AI_RATE_LIMITED without retry storms."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-2.5-flash"
    mock_manager.generate_content = AsyncMock(
        side_effect=AIRateLimitedError("Gemini API quota or rate limit has been exceeded. Please wait a moment and try again.")
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service

    try:
        response = client.post(
            "/api/v1/quiz",
            json={"content": "Genetic inheritance and alleles in pea plants.", "question_count": 3},
            headers={"X-Request-ID": "test-rate-limit-req"},
        )
        assert response.status_code == 429
        data = response.json()
        assert data["error"]["code"] == "AI_RATE_LIMITED"
        assert "quota or rate limit" in data["error"]["message"].lower()
        assert data["error"]["request_id"] == "test-rate-limit-req"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_malformed_structured_output_produces_controlled_error(app, client: TestClient) -> None:
    """Validate that unparseable non-JSON Gemini output triggers AI_GENERATION_ERROR without crashing."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-2.5-flash"
    mock_manager.generate_content = AsyncMock(
        return_value="I am sorry, but here is some unstructured text that has no JSON whatsoever."
    )

    gemini_service = GeminiService(client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service

    try:
        response = client.post(
            "/api/v1/quiz",
            json={"content": "Electromagnetic spectrum and photons.", "question_count": 2},
            headers={"X-Request-ID": "test-malformed-req"},
        )
        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "AI_GENERATION_ERROR"
        assert data["error"]["request_id"] == "test-malformed-req"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_extract_json_from_ai_text_markdown_stripping() -> None:
    """Validate that extract_json_from_ai_text handles markdown code blocks and raw JSON."""
    # Test 1: Markdown wrapped
    raw_markdown = '```json\n{"summary": "Test summary", "key_points": ["Point 1"]}\n```'
    parsed1 = extract_json_from_ai_text(raw_markdown)
    assert parsed1["summary"] == "Test summary"
    assert len(parsed1["key_points"]) == 1

    # Test 2: Raw clean JSON
    raw_clean = '{"status": "ok", "count": 42}'
    parsed2 = extract_json_from_ai_text(raw_clean)
    assert parsed2["status"] == "ok"
    assert parsed2["count"] == 42


def test_missing_gemini_api_key_configuration() -> None:
    """Validate that GeminiClientManager fails with clear AIConfigurationError when key is missing."""
    empty_settings = Settings(
        GEMINI_API_KEY="",
        GEMINI_MODEL="gemini-2.5-flash",
    )
    manager = GeminiClientManager(settings=empty_settings)
    try:
        manager.get_client()
        assert False, "Should have raised AIConfigurationError"
    except AIConfigurationError as exc:
        assert "GEMINI_API_KEY is not configured" in str(exc)


def test_missing_gemini_model_configuration() -> None:
    """Validate that Settings or GeminiClientManager rejects empty GEMINI_MODEL."""
    try:
        Settings(
            GEMINI_API_KEY="test-key",
            GEMINI_MODEL="",
        )
        assert False, "Should have raised validation error for empty GEMINI_MODEL"
    except ValueError as exc:
        assert "GEMINI_MODEL" in str(exc)


def test_secret_is_never_returned_in_responses(app, client: TestClient) -> None:
    """Security audit test: verify that configured secrets never appear in error responses or headers."""
    fake_secret = "AIzaSySecretKeyNeverExpose999"
    secret_settings = Settings(
        GEMINI_API_KEY=fake_secret,
        GEMINI_MODEL="gemini-2.5-flash",
    )

    # Trigger a 500 error deliberately with an exception containing message
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-2.5-flash"
    mock_manager.generate_content = AsyncMock(
        side_effect=AIProviderError("Upstream failure occurred.")
    )

    gemini_service = GeminiService(settings=secret_settings, client_manager=mock_manager)
    app.dependency_overrides[get_ai_service] = lambda: gemini_service

    try:
        response = client.post(
            "/api/v1/qa",
            json={"question": "Security audit test prompt?"},
            headers={"X-Request-ID": "test-sec-req-999"},
        )
        raw_response_text = response.text
        # Assert secret is absent from body, headers, and details
        assert fake_secret not in raw_response_text
        for header_key, header_val in response.headers.items():
            assert fake_secret not in header_val
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
