"""Schemas package aggregating Pydantic data models for EDUGENIE."""

from app.schemas.common import BaseResponse, ErrorPayload, ErrorResponse
from app.schemas.explain import AudienceLevel, ExplainRequest, ExplainResponse, ExplanationDepth
from app.schemas.health import HealthResponse
from app.schemas.learning_path import LearnerLevel, LearningPathRequest, LearningPathResponse, MilestoneStage
from app.schemas.qa import QARequest, QAResponse
from app.schemas.quiz import QuizDifficulty, QuizQuestionItem, QuizRequest, QuizResponse
from app.schemas.summarize import SummarizeRequest, SummarizeResponse, SummaryFormat

__all__ = [
    "BaseResponse",
    "ErrorPayload",
    "ErrorResponse",
    "HealthResponse",
    "QARequest",
    "QAResponse",
    "AudienceLevel",
    "ExplanationDepth",
    "ExplainRequest",
    "ExplainResponse",
    "QuizDifficulty",
    "QuizQuestionItem",
    "QuizRequest",
    "QuizResponse",
    "SummaryFormat",
    "SummarizeRequest",
    "SummarizeResponse",
    "LearnerLevel",
    "MilestoneStage",
    "LearningPathRequest",
    "LearningPathResponse",
]
