"""Services layer for EDUGENIE business logic."""

from app.services.ai_service import AIService, BaseAIService, get_ai_service
from app.services.base import BaseService
from app.services.explanation_service import ExplanationService, get_explanation_service
from app.services.learning_path_service import LearningPathService, get_learning_path_service
from app.services.qa_service import QAService, get_qa_service
from app.services.quiz_service import QuizService, get_quiz_service
from app.services.summary_service import SummaryService, get_summary_service

__all__ = [
    "BaseService",
    "BaseAIService",
    "AIService",
    "get_ai_service",
    "QAService",
    "get_qa_service",
    "ExplanationService",
    "get_explanation_service",
    "QuizService",
    "get_quiz_service",
    "SummaryService",
    "get_summary_service",
    "LearningPathService",
    "get_learning_path_service",
]
