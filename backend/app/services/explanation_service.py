"""Service layer handling Concept Explanation workflows."""

from typing import Optional
from fastapi import Depends

from app.core.auth import AuthenticatedUser
from app.schemas.activity import ActivityType
from app.schemas.explain import ExplainRequest, ExplainResponse
from app.services.activity_service import ActivityService, get_activity_service
from app.services.ai_service import BaseAIService, get_ai_service
from app.services.base import BaseService


class ExplanationService(BaseService):
    """Business service orchestrating concept deconstruction and pedagogical explanations."""

    def __init__(
        self,
        ai_service: BaseAIService,
        activity_service: Optional[ActivityService] = None,
    ) -> None:
        super().__init__(service_name="ExplanationService")
        self.ai_service = ai_service
        self.activity_service = activity_service

    async def process_explanation(
        self,
        request: ExplainRequest,
        request_id: Optional[str] = None,
        user: Optional[AuthenticatedUser] = None,
    ) -> ExplainResponse:
        """Process concept explanation through AI layer for authenticated user."""
        masked_uid = user.masked_uid if user else "anonymous"
        depth_str = request.depth.value if request.depth else "standard"
        self.logger.info(
            "[%s] Explaining concept '%s' for user %s (level=%s, depth=%s)",
            request_id or "NO-REQ-ID",
            request.topic,
            masked_uid,
            request.level.value,
            depth_str,
        )

        response = await self.ai_service.explain_topic(
            topic=request.topic,
            level=request.level.value,
            depth=depth_str,
            enable_web_grounding=bool(request.enable_web_grounding),
        )
        response.request_id = request_id

        if user and user.uid and self.activity_service:
            await self.activity_service.record_activity(
                user_id=user.uid,
                activity_type=ActivityType.EXPLAIN,
                title=response.title or f"Explain: {request.topic}",
                metadata={"topic": request.topic, "level": request.level.value},
            )

        return response


def get_explanation_service(
    ai_service: BaseAIService = Depends(get_ai_service),
    activity_service: ActivityService = Depends(get_activity_service),
) -> ExplanationService:
    """FastAPI dependency provider for ExplanationService injecting BaseAIService and ActivityService."""
    return ExplanationService(ai_service=ai_service, activity_service=activity_service)
