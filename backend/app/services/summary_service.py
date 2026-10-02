"""Service layer handling educational text and lecture summarization."""

import uuid
from typing import Optional
from fastapi import Depends

from app.core.auth import AuthenticatedUser
from app.schemas.activity import ActivityType
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.activity_service import ActivityService, get_activity_service
from app.services.ai_service import BaseAIService, get_ai_service
from app.services.base import BaseService


class SummaryService(BaseService):
    """Business service orchestrating text distillation and note generation."""

    def __init__(
        self,
        ai_service: BaseAIService,
        activity_service: Optional[ActivityService] = None,
    ) -> None:
        super().__init__(service_name="SummaryService")
        self.ai_service = ai_service
        self.activity_service = activity_service

    async def process_summary(
        self,
        request: SummarizeRequest,
        request_id: Optional[str] = None,
        user: Optional[AuthenticatedUser] = None,
    ) -> SummarizeResponse:
        """Process summarization through AI layer for authenticated user."""
        masked_uid = user.masked_uid if user else "anonymous"
        format_val = request.format.value if request.format else "bullet_points"
        length_val = request.length.value if request.length else "medium"

        self.logger.info(
            "[%s] Summarizing %d chars for user %s (length=%s, format=%s)",
            request_id or "NO-REQ-ID",
            len(request.content),
            masked_uid,
            length_val,
            format_val,
        )

        response = await self.ai_service.summarize_text(
            content=request.content,
            length=length_val,
            format=format_val,
            max_length_words=request.max_length_words,
        )
        response.request_id = request_id or response.request_id or f"sum-{uuid.uuid4().hex[:12]}"

        if user and user.uid and self.activity_service:
            await self.activity_service.record_activity(
                user_id=user.uid,
                activity_type=ActivityType.SUMMARIZE,
                title=f"Summary: {length_val.capitalize()} ({len(response.key_points)} key points)",
                metadata={"length": length_val, "format": format_val, "key_points_count": len(response.key_points)},
            )

        return response


def get_summary_service(
    ai_service: BaseAIService = Depends(get_ai_service),
    activity_service: ActivityService = Depends(get_activity_service),
) -> SummaryService:
    """FastAPI dependency provider for SummaryService injecting BaseAIService and ActivityService."""
    return SummaryService(ai_service=ai_service, activity_service=activity_service)
