"""Automated tests for health check endpoints."""

from fastapi.testclient import TestClient


def test_canonical_v1_health_endpoint(client: TestClient) -> None:
    """Validate that canonical GET /api/v1/health returns 200 and matches specification."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data == {
        "status": "ok",
        "service": "edugenie-api",
    }
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time-Ms" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_compatibility_api_health_endpoint(client: TestClient) -> None:
    """Validate that compatibility GET /api/health returns 200 identically."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "edugenie-api"


def test_root_health_probe_alias(client: TestClient) -> None:
    """Validate that container probe GET /health returns 200."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "edugenie-api"


def test_client_provided_request_id_preserved(client: TestClient) -> None:
    """Validate that valid client-supplied X-Request-ID is preserved in response."""
    custom_id = "custom-client-trace-12345"
    response = client.get("/api/v1/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom_id
