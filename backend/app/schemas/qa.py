"""Q&A request and response Pydantic validation schemas."""

from typing import Any, List, Literal, Optional, Union
from pydantic import AliasChoices, BaseModel, Field, field_validator

from app.schemas.research import WebSource


class QARequest(BaseModel):
    """Payload for educational Q&A inquiries."""

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The educational or academic question, greeting, or concept to answer",
        examples=["hi", "What is recursion? Explain it for a beginner.", "What is photosynthesis?"],
    )
    context: Optional[str] = Field(
        default=None,
        max_length=15000,
        description="Optional reference context from study materials or prior conversation",
        examples=["Recursion is a programming technique where a function calls itself..."],
    )
    mode: Literal["ai", "research"] = Field(
        default="ai",
        description="Q&A operating mode: 'ai' for direct Gemini AI response, 'research' for verified web search and grounding",
    )
    enable_web_grounding: bool = Field(
        default=False,
        validation_alias=AliasChoices("enable_web_grounding", "enableWebGrounding"),
        description="Legacy flag for real-time web-grounded search",
    )

    @field_validator("question", mode="before")
    @classmethod
    def validate_and_strip_question(cls, v: object) -> str:
        """Strip surrounding whitespace and reject empty questions."""
        if not isinstance(v, str):
            raise ValueError("Question must be a valid text string.")
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Question cannot be empty or contain only whitespace.")
        if len(trimmed) > 2000:
            raise ValueError("Question exceeds maximum allowed length of 2000 characters.")
        return trimmed

    @field_validator("context", mode="before")
    @classmethod
    def strip_context(cls, v: object) -> Optional[str]:
        """Strip surrounding whitespace from optional context."""
        if v is None:
            return None
        if not isinstance(v, str):
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None

    @field_validator("mode", mode="before")
    @classmethod
    def validate_mode(cls, v: Any) -> str:
        """Normalize and validate operating mode, defaulting to 'ai'."""
        if v is None:
            return "ai"
        if not isinstance(v, str):
            raise ValueError("Mode must be a string: 'ai' or 'research'.")
        clean = v.strip().lower()
        if clean not in ("ai", "research"):
            raise ValueError(f"Invalid mode '{v}'. Allowed modes are 'ai' or 'research'.")
        return clean


class QAResponse(BaseModel):
    """Stable structured response for Q&A inquiries."""

    status: str = Field(default="ok", description="Response status indicator")
    question: str = Field(..., description="Echoed normalized student question")
    answer: str = Field(..., description="Educational answer synthesized by Gemini AI")
    mode: str = Field(default="ai", description="Response operating mode: 'ai' or 'research'")
    sources: List[Union[WebSource, str]] = Field(
        default_factory=list,
        description="Grounding reference sources or citations",
    )
    grounded: bool = Field(default=False, description="Flag indicating if answer was web-grounded")
    model: Optional[str] = Field(default=None, description="Gemini model identifier used for generation")
    request_id: Optional[str] = Field(default=None, description="Request tracking identifier")
