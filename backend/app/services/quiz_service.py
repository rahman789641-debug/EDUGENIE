"""Service layer handling assessment and quiz generation."""

from typing import Optional
from fastapi import Depends

from app.core.auth import AuthenticatedUser
from app.schemas.activity import ActivityType
from app.schemas.quiz import QuizRequest, QuizResponse
from app.services.activity_service import ActivityService, get_activity_service
from app.services.ai_service import BaseAIService, get_ai_service
from app.services.base import BaseService


class QuizService(BaseService):
    """Business service orchestrating multiple-choice assessment generation."""

    def __init__(
        self,
        ai_service: BaseAIService,
        activity_service: Optional[ActivityService] = None,
    ) -> None:
        super().__init__(service_name="QuizService")
        self.ai_service = ai_service
        self.activity_service = activity_service

    async def process_quiz(
        self,
        request: QuizRequest,
        request_id: Optional[str] = None,
        user: Optional[AuthenticatedUser] = None,
    ) -> QuizResponse:
        """Process quiz generation through AI layer for authenticated user."""
        masked_uid = user.masked_uid if user else "anonymous"
        q_count = request.question_count or 3
        self.logger.info(
            "[%s] Generating %d quiz items for user %s (difficulty=%s)",
            request_id or "NO-REQ-ID",
            q_count,
            masked_uid,
            request.difficulty.value,
        )

        response = await self.ai_service.generate_quiz(
            content=request.content,
            question_count=q_count,
            difficulty=request.difficulty.value,
        )
        response.request_id = request_id

        if user and user.uid and self.activity_service:
            await self.activity_service.record_activity(
                user_id=user.uid,
                activity_type=ActivityType.QUIZ,
                title=response.title or f"Quiz: {request.difficulty.value.capitalize()}",
                metadata={"difficulty": request.difficulty.value, "question_count": len(response.questions)},
            )

        return response


def get_quiz_service(
    ai_service: BaseAIService = Depends(get_ai_service),
    activity_service: ActivityService = Depends(get_activity_service),
) -> QuizService:
    """FastAPI dependency provider for QuizService injecting BaseAIService and ActivityService."""
    return QuizService(ai_service=ai_service, activity_service=activity_service)
