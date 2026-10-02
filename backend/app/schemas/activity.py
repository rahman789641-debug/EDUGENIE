"""Learning Activity and Dashboard statistics Pydantic schemas."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ActivityType(str, Enum):
    """Categorization of supported AI learning activities."""

    QA = "qa"
    EXPLAIN = "explain"
    QUIZ = "quiz"
    SUMMARIZE = "summarize"
    LEARNING_PATH = "learning_path"
    RESEARCH = "research"


class LearningActivityItem(BaseModel):
    """Individual recorded learning activity item."""

    id: str = Field(..., description="Unique activity identifier (e.g. 'act-...')")
    user_id: str = Field(..., description="Authenticated Firebase UID")
    activity_type: ActivityType = Field(..., description="Type of learning task performed")
    title: str = Field(..., description="Human-readable title or subject of the activity")
    created_at: str = Field(..., description="ISO 8601 formatted timestamp")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Safe, lightweight metadata (no credentials, tokens, or large conversation bodies)",
    )


class ActivityCreate(BaseModel):
    """Internal model for recording a newly completed learning activity."""

    user_id: str = Field(..., description="Verified Firebase UID")
    activity_type: ActivityType = Field(..., description="Type of learning activity")
    title: str = Field(..., min_length=1, max_length=500, description="Activity title")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Safe metadata")

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Title cannot be empty")
        return trimmed[:500]


class ActivityListResponse(BaseModel):
    """Paginated list of user learning activities."""

    items: List[LearningActivityItem] = Field(default_factory=list, description="Activities on current page")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")
    total: int = Field(..., ge=0, description="Total count of activities matching query")
    total_pages: int = Field(..., ge=0, description="Total available pages")


class DashboardStatsResponse(BaseModel):
    """Aggregated learning metrics and overview for authenticated user."""

    total_activities: int = Field(default=0, ge=0, description="Total learning activities completed")
    questions_asked: int = Field(default=0, ge=0, description="Count of Q&A queries completed")
    explanations_generated: int = Field(default=0, ge=0, description="Count of concept explanations generated")
    quizzes_completed: int = Field(default=0, ge=0, description="Count of quizzes generated/completed")
    summaries_generated: int = Field(default=0, ge=0, description="Count of summaries generated")
    learning_paths_generated: int = Field(default=0, ge=0, description="Count of learning paths generated")
    research_queries: int = Field(default=0, ge=0, description="Count of web research sessions conducted")
    quiz_stats: Optional[Dict[str, Any]] = Field(default=None, description="Additional assessment statistics if available")
    recent_activities: List[LearningActivityItem] = Field(
        default_factory=list,
        description="Most recent activities for quick dashboard display",
    )
