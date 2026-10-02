"""Text and lecture summarization request and response schemas for EduGenie."""

from enum import Enum
from typing import List, Optional
from pydantic import AliasChoices, BaseModel, Field, field_validator, model_validator


class SummaryLength(str, Enum):
    """Summary granularity and target depth."""

    SHORT = "short"
    MEDIUM = "medium"
    DETAILED = "detailed"


class SummaryFormat(str, Enum):
    """Desired structural format for educational summary (legacy compatibility)."""

    BULLET_POINTS = "bullet_points"
    EXECUTIVE_SUMMARY = "executive_summary"
    KEY_TAKEAWAYS = "key_takeaways"


class SummarizeRequest(BaseModel):
    """Payload for summarizing educational content or lecture notes."""

    content: str = Field(
        ...,
        min_length=10,
        max_length=50000,
        validation_alias=AliasChoices("content", "text"),
        description="Educational passage, lecture transcript, or textbook section to summarize",
        examples=["Cellular respiration is a set of metabolic reactions that convert chemical energy into ATP..."],
    )
    length: SummaryLength = Field(
        default=SummaryLength.MEDIUM,
        description="Desired summary length: short, medium, or detailed",
        examples=["medium"],
    )
    format: Optional[SummaryFormat] = Field(
        default=SummaryFormat.BULLET_POINTS,
        description="Structural format of summary output (legacy compatibility)",
    )
    max_length_words: Optional[int] = Field(
        default=None,
        ge=10,
        le=3000,
        validation_alias=AliasChoices("max_length_words", "max_length", "maxLength"),
        description="Optional maximum word limit for the resulting summary",
    )

    @field_validator("content", mode="before")
    @classmethod
    def validate_content(cls, value: object) -> str:
        """Strip whitespace and reject empty or whitespace-only content."""
        if not isinstance(value, str):
            raise ValueError("Content must be a text string.")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Content cannot be empty or contain only whitespace.")
        return stripped

    @field_validator("length", mode="before")
    @classmethod
    def normalize_length(cls, value: object) -> object:
        """Normalize case for summary length enum."""
        if isinstance(value, str):
            val_lower = value.strip().lower()
            return val_lower
        return value


class SummarizeResponse(BaseModel):
    """Structured response for summarization."""

    summary: str = Field(..., description="Main synthesized summary text")
    key_points: List[str] = Field(default_factory=list, description="Extracted bullet takeaways or key concepts")
    length: str = Field(default="medium", description="Summary length applied (short, medium, detailed)")
    request_id: Optional[str] = Field(default=None, description="Request tracking identifier")

    # Legacy & metadata fields
    status: Optional[str] = Field(default="ok", description="Response status")
    format: Optional[str] = Field(default="bullet_points", description="Applied summary format")
    original_length_chars: Optional[int] = Field(default=None, description="Character count of original input content")
    summary_length_chars: Optional[int] = Field(default=None, description="Character count of generated summary")
    model: Optional[str] = Field(default=None, description="Gemini model identifier used for generation")

    @model_validator(mode="after")
    def calculate_lengths(self) -> "SummarizeResponse":
        if self.summary_length_chars is None and self.summary:
            self.summary_length_chars = len(self.summary)
        return self
