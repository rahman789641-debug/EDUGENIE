"""Concept Explanation request and response schemas."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ExplanationLevel(str, Enum):
    """Target learner level for concept explanation."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# Backward compatibility alias
AudienceLevel = ExplanationLevel


class ExplanationDepth(str, Enum):
    """Depth and granularity of the pedagogical breakdown."""

    SUMMARY = "summary"
    STANDARD = "standard"
    IN_DEPTH = "in_depth"


class ExplainRequest(BaseModel):
    """Payload for requesting an explanation of a concept."""

    topic: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Concept or academic topic to explain",
        examples=["Recursion"],
    )
    level: ExplanationLevel = Field(
        default=ExplanationLevel.BEGINNER,
        description="Target learner level: beginner, intermediate, or advanced",
        examples=["beginner"],
    )
    depth: Optional[ExplanationDepth] = Field(
        default=ExplanationDepth.STANDARD,
        description="Depth of detail for the explanation (optional)",
    )
    enable_web_grounding: Optional[bool] = Field(
        default=False,
        description="Whether to enable real-time search grounding with Gemini (disabled in Step 7)",
    )

    @field_validator("topic", mode="before")
    @classmethod
    def validate_topic(cls, value: object) -> str:
        """Strip whitespace and reject empty or whitespace-only topic strings."""
        if not isinstance(value, str):
            raise ValueError("Topic must be a text string.")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Topic cannot be empty or contain only whitespace.")
        return stripped

    @field_validator("level", mode="before")
    @classmethod
    def normalize_level(cls, value: object) -> object:
        """Normalize case and map legacy audience levels to beginner, intermediate, or advanced."""
        if isinstance(value, str):
            val_lower = value.strip().lower()
            legacy_mapping = {
                "elementary": "beginner",
                "high_school": "beginner",
                "undergraduate": "intermediate",
                "professional": "advanced",
            }
            if val_lower in legacy_mapping:
                return legacy_mapping[val_lower]
            return val_lower
        return value


class ExplainResponse(BaseModel):
    """Structured response for concept explanations."""

    topic: str = Field(..., description="Subject explained")
    level: str = Field(..., description="Pedagogical level applied (beginner, intermediate, advanced)")
    title: str = Field(..., description="Descriptive pedagogical title")
    explanation: str = Field(..., description="Synthesized, structured explanation text")
    key_points: List[str] = Field(
        default_factory=list,
        description="Core key takeaways and conceptual points",
    )
    example: str = Field(
        default="",
        description="Tangible illustrative example, code block, or practical walkthrough",
    )
    request_id: Optional[str] = Field(
        default=None,
        description="Request tracking identifier",
    )

    # Backward compatibility and metadata fields
    status: Optional[str] = Field(default="ok", description="Response status")
    depth: Optional[str] = Field(default="standard", description="Depth level applied")
    analogies: Optional[List[str]] = Field(default_factory=list, description="Intuitive analogies used")
    key_takeaways: Optional[List[str]] = Field(default_factory=list, description="Legacy alias for key_points")
    model: Optional[str] = Field(default=None, description="Gemini model identifier used for generation")
