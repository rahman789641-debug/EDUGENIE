"""Automated tests for centralized configuration loading and parsing."""

from app.core.config import Settings


def test_default_settings_loading() -> None:
    """Test default settings instantiation, aliases, and types."""
    settings = Settings(
        APP_NAME="EDUGENIE",
        APP_ENV="test",
        DEBUG=True,
        APP_HOST="127.0.0.1",
        APP_PORT=8080,
        API_V1_PREFIX="/api/v1",
        GEMINI_MODEL="gemini-3.1-flash-lite",
        GEMINI_API_KEY="",
    )
    assert settings.APP_NAME == "EDUGENIE"
    assert settings.APP_ENV == "test"
    assert settings.DEBUG is True
    assert settings.APP_HOST == "127.0.0.1"
    assert settings.APP_PORT == 8080
    assert settings.API_V1_PREFIX == "/api/v1"
    assert settings.GEMINI_MODEL == "gemini-3.1-flash-lite"
    assert not settings.is_gemini_configured


def test_cors_origins_json_parsing() -> None:
    """Test parsing CORS origins from a JSON formatted string."""
    settings = Settings(
        CORS_ORIGINS='["http://example.com", "http://localhost:5173"]',
    )
    assert settings.CORS_ORIGINS == ["http://example.com", "http://localhost:5173"]


def test_cors_origins_comma_separated_parsing() -> None:
    """Test parsing CORS origins from a comma-separated string."""
    settings = Settings(
        CORS_ORIGINS="http://domain1.com, http://domain2.com",
    )
    assert settings.CORS_ORIGINS == ["http://domain1.com", "http://domain2.com"]


def test_gemini_configuration_state() -> None:
    """Test is_gemini_configured property behavior."""
    unconfigured = Settings(GEMINI_API_KEY="")
    assert not unconfigured.is_gemini_configured

    configured = Settings(GEMINI_API_KEY="test_api_key_value")
    assert configured.is_gemini_configured
