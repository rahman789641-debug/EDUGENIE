"""Service layer handling personalized learning paths and recommendation roadmaps."""

import uuid
from typing import Optional
from fastapi import Depends

from app.core.auth import AuthenticatedUser
from app.schemas.activity import ActivityType
from app.schemas.learning_path import LearningPathRequest, LearningPathResponse
from app.services.activity_service import ActivityService, get_activity_service
from app.services.ai_service import BaseAIService, get_ai_service
from app.services.base import BaseService


class LearningPathService(BaseService):
    """Business service orchestrating curriculum progression and milestone pathways."""

    def __init__(
        self,
        ai_service: BaseAIService,
        activity_service: Optional[ActivityService] = None,
    ) -> None:
        super().__init__(service_name="LearningPathService")
        self.ai_service = ai_service
        self.activity_service = activity_service

    async def process_learning_path(
        self,
        request: LearningPathRequest,
        request_id: Optional[str] = None,
        user: Optional[AuthenticatedUser] = None,
    ) -> LearningPathResponse:
        """Process learning path generation through AI layer with masked user logging."""
        masked_uid = user.masked_uid if user else "anonymous"
        goal_val = request.goal or request.target_goal

        self.logger.info(
            "[%s] Generating learning path for '%s' (level=%s, goal='%s') for user %s",
            request_id or "NO-REQ-ID",
            request.topic,
            request.level.value,
            goal_val or "general",
            masked_uid,
        )

        response = await self.ai_service.generate_learning_path(
            topic=request.topic,
            current_level=request.level.value,
            target_goal=goal_val,
            duration_weeks=request.duration_weeks,
        )
        response.request_id = request_id or response.request_id or f"lp-{uuid.uuid4().hex[:12]}"

        if user and user.uid and self.activity_service:
            await self.activity_service.record_activity(
                user_id=user.uid,
                activity_type=ActivityType.LEARNING_PATH,
                title=f"Learning Path: {request.topic}",
                metadata={"topic": request.topic, "level": request.level.value, "stages_count": response.total_stages},
            )

        return response


def get_learning_path_service(
    ai_service: BaseAIService = Depends(get_ai_service),
    activity_service: ActivityService = Depends(get_activity_service),
) -> LearningPathService:
    """FastAPI dependency provider for LearningPathService injecting BaseAIService and ActivityService."""
    return LearningPathService(ai_service=ai_service, activity_service=activity_service)
