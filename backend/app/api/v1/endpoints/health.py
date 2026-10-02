"""Health check endpoint for liveness and readiness probes."""

from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Check the operational status of the EDUGENIE backend service.",
    tags=["Observability"],
)
async def check_health() -> HealthResponse:
    """Return health status payload conforming to the architectural specification."""
    return HealthResponse(status="ok", service="edugenie-api")
