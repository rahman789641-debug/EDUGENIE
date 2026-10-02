"""Common shared Pydantic response models and envelopes."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ErrorPayload(BaseModel):
    """Structured error payload definition."""

    code: str = Field(..., description="Machine-readable error code", examples=["VALIDATION_ERROR"])
    message: str = Field(..., description="Human-readable error explanation", examples=["Invalid request."])
    request_id: Optional[str] = Field(default=None, description="Unique trace identifier for request debugging", examples=["req-123e4567"])
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional context or validation details")


class ErrorResponse(BaseModel):
    """Standardized error envelope across all API endpoints."""

    error: ErrorPayload


class BaseResponse(BaseModel):
    """Standard base success envelope."""

    status: str = Field(default="ok", description="Operation status indicator")
    request_id: Optional[str] = Field(default=None, description="Unique trace identifier")
