"""Automated tests for backend error handling and validation."""

from fastapi import APIRouter
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.exceptions import ResourceNotFoundError
from app.main import create_app


class SampleRequest(BaseModel):
    required_name: str = Field(..., min_length=3)
    score: int = Field(..., ge=0, le=100)


def test_exception_handling_and_validation() -> None:
    """Test custom AppException handling and request validation formatting."""
    app = create_app(Settings(APP_ENV="test"))
    test_router = APIRouter()

    @test_router.get("/test-not-found")
    async def not_found_route():
        raise ResourceNotFoundError(resource="UserCourse", identifier="math-101")

    @test_router.post("/test-validation")
    async def validation_route(payload: SampleRequest):
        return {"status": "success", "data": payload.model_dump()}

    app.include_router(test_router, prefix="/api")

    with TestClient(app) as client:
        # Test custom domain exception
        res = client.get("/api/test-not-found")
        assert res.status_code == 404
        data = res.json()
        assert "error" in data
        assert data["error"]["code"] == "RESOURCE_NOT_FOUND"
        assert "request_id" in data["error"]
        assert "math-101" in data["error"]["message"]

        # Test request validation failure (422)
        bad_res = client.post("/api/test-validation", json={"required_name": "a", "score": 150})
        assert bad_res.status_code == 422
        bad_data = bad_res.json()
        assert "error" in bad_data
        assert bad_data["error"]["code"] == "VALIDATION_ERROR"
        assert "request_id" in bad_data["error"]
        assert "details" in bad_data["error"]
        assert len(bad_data["error"]["details"]["errors"]) >= 1


def test_payload_too_large_rejection() -> None:
    """Test that requests exceeding MAX_REQUEST_BODY_BYTES are rejected with HTTP 413."""
    app = create_app(Settings(APP_ENV="test", MAX_REQUEST_BODY_BYTES=50))
    test_router = APIRouter()

    @test_router.post("/test-upload")
    async def upload_route(payload: dict):
        return {"status": "ok"}

    app.include_router(test_router, prefix="/api")

    with TestClient(app) as client:
        large_payload = {"data": "x" * 200}
        res = client.post("/api/test-upload", json=large_payload)
        assert res.status_code == 413
        data = res.json()
        assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"
        assert "request_id" in data["error"]
