"""Health check endpoint for liveness, readiness, and gateway verification."""

from fastapi import APIRouter, status
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Canonical Service Health Check",
    description="Check the operational status of the EDUGENIE backend. Does not require Gemini credentials.",
    tags=["Observability"],
)
async def get_health() -> HealthResponse:
    """Return health payload conforming to specification."""
    return HealthResponse(status="ok", service="edugenie-api")
