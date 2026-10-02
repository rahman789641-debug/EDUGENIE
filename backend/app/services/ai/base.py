"""Abstract interface for AI educational services."""

from abc import ABC, abstractmethod
from typing import Optional

from app.schemas.explain import ExplainResponse
from app.schemas.learning_path import LearningPathResponse
from app.schemas.qa import QAResponse
from app.schemas.quiz import QuizResponse
from app.schemas.summarize import SummarizeResponse
from app.services.base import BaseService


class BaseAIService(BaseService, ABC):
    """Abstract base class defining the contract for AI learning assistant capabilities."""

    @abstractmethod
    async def answer_question(
        self,
        question: str,
        context: Optional[str] = None,
        enable_web_grounding: bool = False,
    ) -> QAResponse:
        """Answer an educational question with optional reference context and grounding."""
        pass

    @abstractmethod
    async def explain_topic(
        self,
        topic: str,
        level: str = "beginner",
        depth: str = "standard",
        enable_web_grounding: bool = False,
    ) -> ExplainResponse:
        """Explain an academic or technical concept tailored to audience level."""
        pass

    @abstractmethod
    async def generate_quiz(
        self,
        content: str,
        question_count: int = 3,
        difficulty: str = "beginner",
    ) -> QuizResponse:
        """Generate structured quiz items with questions, options, answers, and explanations."""
        pass

    @abstractmethod
    async def summarize_text(
        self,
        content: str,
        length: str = "medium",
        format: str = "bullet_points",
        max_length_words: Optional[int] = None,
    ) -> SummarizeResponse:
        """Summarize lengthy educational material or lecture notes."""
        pass

    @abstractmethod
    async def generate_learning_path(
        self,
        topic: str,
        current_level: str,
        target_goal: Optional[str] = None,
        duration_weeks: Optional[int] = 8,
    ) -> LearningPathResponse:
        """Generate a personalized learning progression roadmap."""
        pass

    async def synthesize_research(
        self,
        query: str,
        sources_context: str,
        conversation_context: Optional[str] = None,
    ) -> str:
        """Synthesize source-grounded educational answer based on retrieved external research."""
        raise NotImplementedError("synthesize_research must be implemented by concrete subclass.")

