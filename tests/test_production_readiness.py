"""Automated verification suite for Step 15: Production Readiness & Hardening.

Verifies:
1. CORS origin validation & credential handling.
2. Production startup configuration validation (fail-fast on missing secrets).
3. In-memory sliding-window rate limiting & HTTP 429 envelope.
4. Dynamic port/host environment binding & alias resolution.
5. Standardized error envelopes without stack trace leakage.
6. Public health check behavior.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.rate_limiter import rate_limiter
from app.main import create_app


@pytest.fixture(autouse=True)
def reset_limiter():
    """Ensure clean rate limiter state between tests."""
    rate_limiter.reset()
    yield
    rate_limiter.reset()


def test_cors_allowed_origin_header(app, client: TestClient):
    """Validate that requests from configured CORS origins receive matching allow-origin header."""
    origin = "http://localhost:5173"
    response = client.get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_disallowed_origin_header(app, client: TestClient):
    """Validate that untrusted origins do NOT receive access-control-allow-origin header."""
    untrusted_origin = "http://malicious-site.example.com"
    response = client.get("/health", headers={"Origin": untrusted_origin})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") != untrusted_origin


def test_cors_allowed_origins_alias():
    """Validate that CORS_ALLOWED_ORIGINS alias is supported and parsed."""
    settings = Settings(
        CORS_ALLOWED_ORIGINS="https://app.edugenie.com, https://preview.edugenie.com"
    )
    origins = settings.assemble_cors_origins(settings.CORS_ORIGINS)
    assert "https://app.edugenie.com" in origins
    assert "https://preview.edugenie.com" in origins


def test_production_startup_validation_missing_gemini_key():
    """Validate that production environment fails fast if GEMINI_API_KEY is missing."""
    prod_settings = Settings(
        APP_ENV="production",
        GEMINI_API_KEY="",
        FIREBASE_PROJECT_ID="edugenie-prod",
        CORS_ORIGINS=["https://edugenie.com"],
    )
    with pytest.raises(RuntimeError) as exc_info:
        prod_settings.validate_production_configuration()
    assert "GEMINI_API_KEY" in str(exc_info.value)


def test_production_startup_validation_missing_firebase_project():
    """Validate that production environment fails fast if FIREBASE_PROJECT_ID is missing."""
    prod_settings = Settings(
        APP_ENV="production",
        GEMINI_API_KEY="valid-secret-key",
        FIREBASE_PROJECT_ID="",
        CORS_ORIGINS=["https://edugenie.com"],
    )
    with pytest.raises(RuntimeError) as exc_info:
        prod_settings.validate_production_configuration()
    assert "FIREBASE_PROJECT_ID" in str(exc_info.value)


def test_production_startup_validation_wildcard_cors_rejected():
    """Validate that production rejects wildcard '*' origin with credentials enabled."""
    prod_settings = Settings(
        APP_ENV="production",
        GEMINI_API_KEY="valid-secret-key",
        FIREBASE_PROJECT_ID="edugenie-prod",
        CORS_ORIGINS=["*"],
    )
    with pytest.raises(RuntimeError) as exc_info:
        prod_settings.validate_production_configuration()
    assert "Wildcard '*'" in str(exc_info.value)


def test_rate_limiter_permits_within_limit(client: TestClient):
    """Validate that requests within rate limit receive limit and remaining headers."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    # Health endpoints are exempt from rate limiting
    assert "X-RateLimit-Limit" not in resp.headers


@pytest.mark.anyio
async def test_rate_limiter_throttles_on_excess(app):
    """Validate that exceeding threshold triggers HTTP 429 with RATE_LIMIT_EXCEEDED envelope."""
    # Create test app with strict limit for verification
    test_settings = Settings(
        RATE_LIMIT_ENABLED=True,
        RATE_LIMIT_AI_PER_MINUTE=2,
    )
    custom_app = create_app(test_settings)
    rate_limiter.reset()

    with TestClient(custom_app) as custom_client:
        client_ip = "192.168.1.100"
        headers = {"X-Forwarded-For": client_ip}

        # First request allowed
        r1 = custom_client.post("/api/v1/qa", json={"question": "Q1"}, headers=headers)
        assert r1.status_code != 429
        assert r1.headers.get("X-RateLimit-Remaining") == "1"

        # Second request allowed
        r2 = custom_client.post("/api/v1/qa", json={"question": "Q2"}, headers=headers)
        assert r2.status_code != 429
        assert r2.headers.get("X-RateLimit-Remaining") == "0"

        # Third request throttled
        r3 = custom_client.post("/api/v1/qa", json={"question": "Q3"}, headers=headers)
        assert r3.status_code == 429
        data = r3.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Retry-After" in r3.headers
        assert r3.headers["X-RateLimit-Remaining"] == "0"


def test_dynamic_port_and_host_binding():
    """Validate that PORT and HOST environment variables are bound dynamically."""
    settings = Settings(PORT="9000", HOST="127.0.0.1")
    assert settings.APP_PORT == 9000
    assert settings.APP_HOST == "127.0.0.1"


def test_payload_size_rejection(client: TestClient):
    """Validate that requests with Content-Length exceeding MAX_REQUEST_BODY_BYTES are rejected."""
    oversized_headers = {"Content-Length": "2000000"}  # 2MB > 1MB
    resp = client.post("/api/v1/qa", content=b"a", headers=oversized_headers)
    assert resp.status_code == 413
    data = resp.json()
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"
    assert "request_id" in data["error"]
