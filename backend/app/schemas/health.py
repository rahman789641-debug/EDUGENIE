"""Health check schemas for system observability."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """System health check payload."""

    status: str = Field(default="ok", description="Operational status of the API service")
    service: str = Field(default="edugenie-api", description="Service identifier")
