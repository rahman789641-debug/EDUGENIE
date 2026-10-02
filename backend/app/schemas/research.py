"""Pydantic schemas for EduGenie Web Research and Source Grounding."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


class WebSource(BaseModel):
    """Structured external web source citation."""

    title: str = Field(..., min_length=1, description="Web page title")
    url: str = Field(..., min_length=1, description="Canonical source URL")
    domain: str = Field(..., min_length=1, description="Source domain name or publication")
    snippet: str = Field(default="", description="Relevant retrieved textual excerpt")


class ResearchRequest(BaseModel):
    """Payload for natural-language educational web research."""

    query: str = Field(
        ...,
        min_length=2,
        max_length=1000,
        description="Natural-language question or research topic",
        examples=["What are the latest official developments in Python?"],
    )

    @field_validator("query", mode="before")
    @classmethod
    def clean_query(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("Research query must be a string.")
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Research query cannot be empty or purely whitespace.")
        if len(trimmed) < 2:
            raise ValueError("Research query must be at least 2 characters long.")
        if len(trimmed) > 1000:
            raise ValueError("Research query must not exceed 1,000 characters.")
        return trimmed


class ResearchResponse(BaseModel):
    """Structured response containing source-grounded answer and external citations."""

    query: str = Field(..., description="Original research query")
    answer: str = Field(..., description="Synthesized source-grounded educational answer")
    sources: List[WebSource] = Field(
        default_factory=list,
        description="Verified external web sources retrieved and consulted",
    )
    request_id: Optional[str] = Field(default=None, description="Request tracking identifier")
    searched: bool = Field(default=True, description="Flag indicating external web research occurred")
    model: Optional[str] = Field(default=None, description="Gemini model identifier used for synthesis")
    status: str = Field(default="ok", description="Response status")
