"""Learning Path and Recommendations request and response schemas."""

import re
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import (
    AliasChoices,
    BaseModel,
    Field,
    computed_field,
    field_validator,
    model_validator,
)


class LearnerLevel(str, Enum):
    """Current competency baseline."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ResourceType(str, Enum):
    """Categorization for educational reference material."""

    VIDEO = "video"
    ARTICLE = "article"
    BOOK = "book"
    DOCUMENTATION = "documentation"
    COURSE = "course"


class LearningResource(BaseModel):
    """Structured educational resource recommendation without fabricated links."""

    type: str = Field(default="documentation", description="Resource format (video, article, book, documentation)")
    title: str = Field(..., min_length=1, max_length=300, description="Resource title or publication name")
    url: Optional[str] = Field(default=None, description="Verified link, strictly null if unverified")

    @field_validator("url", mode="before")
    @classmethod
    def sanitize_unverified_url(cls, v: Any) -> Optional[str]:
        """Strictly enforce null for unverified, placeholder, or fabricated URLs."""
        if not v or not isinstance(v, str):
            return None
        clean = v.strip()
        if not clean or clean.lower() in ("null", "none", "#", "about:blank"):
            return None
        # Reject obvious fictitious placeholder domains
        lower = clean.lower()
        if any(f in lower for f in ("example.com", "fake", "placeholder", "test.com", "foo.com", "yourlink.com")):
            return None
        if not (clean.startswith("http://") or clean.startswith("https://")):
            return None
        # Per prompt: Step 10 has no web research; AI links are unverified. Enforce null.
        return None


class LearningStage(BaseModel):
    """Structured milestone stage within a learning progression roadmap."""

    stage: int = Field(
        ...,
        validation_alias=AliasChoices("stage", "stage_number"),
        description="Chronological milestone index (1, 2, 3...)",
    )
    title: str = Field(..., min_length=1, max_length=300, description="Stage module title")
    difficulty: str = Field(
        default="beginner",
        validation_alias=AliasChoices("difficulty", "level"),
        description="Stage difficulty level (beginner, intermediate, advanced)",
    )
    concepts: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("concepts", "focus_concepts"),
        description="Core competencies and topics taught in this stage",
    )
    practice: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("practice", "recommended_activities"),
        description="Practical coding exercises, active tasks, or projects",
    )
    resources: List[LearningResource] = Field(
        default_factory=list,
        description="Recommended educational learning materials with title and type",
    )
    checkpoint_project: Optional[str] = Field(
        default=None,
        description="Culminating practical project verifying mastery (legacy compatibility)",
    )

    # Legacy field aliases for existing code and test suite compatibility
    @computed_field
    @property
    def stage_number(self) -> int:
        return self.stage

    @computed_field
    @property
    def focus_concepts(self) -> List[str]:
        return self.concepts

    @computed_field
    @property
    def recommended_activities(self) -> List[str]:
        return self.practice


# Backward compatibility alias
MilestoneStage = LearningStage


class LearningPathRequest(BaseModel):
    """Payload for generating personalized milestone recommendations and learning pathways."""

    topic: str = Field(
        ...,
        min_length=2,
        max_length=500,
        validation_alias=AliasChoices("topic", "subject"),
        description="Target subject, discipline, or skill area",
        examples=["Python Programming"],
    )
    level: LearnerLevel = Field(
        default=LearnerLevel.BEGINNER,
        validation_alias=AliasChoices("level", "current_level", "currentLevel"),
        description="Student current baseline competency",
        examples=["beginner"],
    )
    goal: Optional[str] = Field(
        default=None,
        max_length=1000,
        validation_alias=AliasChoices("goal", "target_goal", "targetGoal"),
        description="Specific mastery goal, certification target, or project aspiration",
        examples=["Become a backend developer"],
    )
    duration_weeks: Optional[int] = Field(
        default=8,
        ge=1,
        le=52,
        validation_alias=AliasChoices("duration_weeks", "timeframe_weeks", "timeframeWeeks"),
        description="Estimated learning timeframe in weeks (1 to 52)",
        examples=[8],
    )

    @field_validator("topic", mode="before")
    @classmethod
    def validate_topic(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("Topic must be a text string.")
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Topic cannot be empty or purely whitespace.")
        if len(trimmed) < 2:
            raise ValueError("Topic must be at least 2 characters.")
        if len(trimmed) > 500:
            raise ValueError("Topic must not exceed 500 characters.")
        return trimmed

    @field_validator("level", mode="before")
    @classmethod
    def normalize_level(cls, v: Any) -> LearnerLevel:
        if isinstance(v, LearnerLevel):
            return v
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in ("beginner", "intermediate", "advanced"):
                return LearnerLevel(clean)
        return LearnerLevel.BEGINNER

    @field_validator("goal", mode="before")
    @classmethod
    def validate_goal(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if not isinstance(v, str):
            return None
        trimmed = v.strip()
        if not trimmed:
            return None
        if len(trimmed) > 1000:
            raise ValueError("Goal must not exceed 1,000 characters.")
        return trimmed

    @property
    def target_goal(self) -> Optional[str]:
        return self.goal


class LearningPathResponse(BaseModel):
    """Structured response containing personalized roadmap progression."""

    status: str = Field(default="ok", description="Response status")
    topic: str = Field(..., description="Subject domain of roadmap")
    level: str = Field(
        ...,
        validation_alias=AliasChoices("level", "current_level"),
        description="Starting baseline level",
    )
    goal: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("goal", "target_goal"),
        description="Stated mastery goal",
    )
    overview: str = Field(
        default="Personalized educational learning path synthesized by EduGenie.",
        description="High-level roadmap strategic overview",
    )
    stages: List[LearningStage] = Field(
        default_factory=list,
        validation_alias=AliasChoices("stages", "milestones"),
        description="Ordered milestone progression stages",
    )
    milestones: List[LearningStage] = Field(
        default_factory=list,
        description="Legacy alias for stages",
    )
    total_stages: int = Field(default=0, description="Count of milestone stages")
    next_steps: List[str] = Field(
        default_factory=list,
        description="Recommended next actions upon completing the path",
    )
    model: Optional[str] = Field(default=None, description="Gemini model identifier used for generation")
    request_id: Optional[str] = Field(default=None, description="Request tracking identifier")

    @property
    def target_goal(self) -> Optional[str]:
        return self.goal

    @model_validator(mode="after")
    def sync_stages_and_milestones(self) -> "LearningPathResponse":
        """Synchronize stages and milestones for dual schema compatibility."""
        if self.stages and not self.milestones:
            self.milestones = self.stages
        elif self.milestones and not self.stages:
            self.stages = self.milestones

        if not self.total_stages:
            self.total_stages = len(self.stages)
        return self
