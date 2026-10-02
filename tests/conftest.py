"""Pytest fixtures and configuration for EDUGENIE backend test suite."""

import sys
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import Settings
from app.main import create_app


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Fixture returning clean test settings."""
    return Settings(
        APP_NAME="EDUGENIE_TEST",
        APP_ENV="test",
        DEBUG=True,
        APP_HOST="127.0.0.1",
        APP_PORT=8000,
        API_V1_PREFIX="/api/v1",
        GEMINI_MODEL="gemini-3.1-flash-lite",
        CORS_ORIGINS=["http://localhost:5173", "http://testserver"],
        MAX_REQUEST_BODY_BYTES=100000,
        GEMINI_API_KEY="",
    )


@pytest.fixture(scope="session")
def app(test_settings: Settings):
    """Fixture returning the FastAPI application instance."""
    return create_app(custom_settings=test_settings)


@pytest.fixture
def client(app, test_settings: Settings) -> Generator[TestClient, None, None]:
    """Fixture providing a synchronous HTTP test client isolated from local .env secrets."""
    from app.core.auth import AuthenticatedUser, get_current_user
    from app.services.ai.gemini_service import GeminiService
    from app.services.ai_service import get_ai_service
    from app.core.config import get_settings

    default_ai_service = GeminiService(settings=test_settings)
    app.dependency_overrides[get_settings] = lambda: test_settings
    if get_ai_service not in app.dependency_overrides:
        app.dependency_overrides[get_ai_service] = lambda: default_ai_service

    mock_user = AuthenticatedUser(
        uid="test-student-uid-12345",
        email="student@edugenie.test",
        display_name="Test Student",
        email_verified=True,
        claims={"uid": "test-student-uid-12345", "email": "student@edugenie.test"},
    )
    app.dependency_overrides[get_current_user] = lambda: mock_user

    with TestClient(app) as test_client:
        yield test_client

    # Reset default test overrides
    app.dependency_overrides[get_ai_service] = lambda: default_ai_service
    app.dependency_overrides[get_current_user] = lambda: mock_user


@pytest.fixture
def anyio_backend():
    """Ensure anyio tests run with asyncio backend."""
    return "asyncio"

