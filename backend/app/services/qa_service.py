"""Service layer handling educational Q&A inquiries with dual AI & Web Research modes."""

import logging
import uuid
from typing import Optional
from fastapi import Depends

from app.core.auth import AuthenticatedUser
from app.schemas.qa import QARequest, QAResponse
from app.schemas.research import ResearchRequest
from app.schemas.activity import ActivityType
from app.services.activity_service import ActivityService, get_activity_service
from app.services.ai_service import BaseAIService, get_ai_service
from app.services.base import BaseService
from app.services.web_research_service import WebResearchService, get_web_research_service

logger = logging.getLogger("edugenie.services.qa")


class QAService(BaseService):
    """Business service orchestrating Question and Answering workflows across AI and Research modes."""

    def __init__(
        self,
        ai_service: BaseAIService,
        research_service: Optional[WebResearchService] = None,
        activity_service: Optional[ActivityService] = None,
    ) -> None:
        super().__init__(service_name="QAService")
        self.ai_service = ai_service
        self.research_service = research_service
        self.activity_service = activity_service


    async def process_qa(
        self,
        request: QARequest,
        request_id: Optional[str] = None,
        user: Optional[AuthenticatedUser] = None,
    ) -> QAResponse:
        """Process Q&A inquiry in either direct AI mode or verified Web Research mode."""
        masked_user = user.masked_uid if user else "unauthenticated"
        req_id = request_id or f"qa-{uuid.uuid4().hex[:12]}"
        mode = getattr(request, "mode", "ai") or "ai"

        self.logger.info(
            "[%s] Executing Q&A inquiry in '%s' mode for user %s (query length: %d chars)",
            req_id,
            mode,
            masked_user,
            len(request.question),
        )

        # 1. AI Answer Mode (Direct Gemini AI response without web search)
        if mode == "ai":
            response = await self.ai_service.answer_question(
                question=request.question,
                context=request.context,
                enable_web_grounding=False,
            )
            response.mode = "ai"
            response.sources = []
            response.grounded = False
            response.request_id = req_id

            if user and user.uid and self.activity_service:
                await self.activity_service.record_activity(
                    user_id=user.uid,
                    activity_type=ActivityType.QA,
                    title=request.question[:100],
                    metadata={
                        "mode": "ai",
                        "question": request.question,
                        "answer": response.answer,
                    },
                )
            return response

        # 2. Web Research Mode (Real web search -> citation grounding -> Gemini synthesis)
        if not self.research_service:
            self.research_service = WebResearchService(ai_service=self.ai_service, activity_service=self.activity_service)

        research_req = ResearchRequest(query=request.question)
        research_res = await self.research_service.conduct_research(
            request=research_req,
            request_id=req_id,
            user=user,
            conversation_context=request.context,
        )

        if user and user.uid and self.activity_service:
            await self.activity_service.record_activity(
                user_id=user.uid,
                activity_type=ActivityType.QA,
                title=request.question[:100],
                metadata={
                    "mode": "research",
                    "question": request.question,
                    "answer": research_res.answer,
                    "sources_count": len(research_res.sources),
                },
            )

        return QAResponse(
            status="ok",
            question=request.question,
            answer=research_res.answer,
            mode="research",
            sources=research_res.sources,
            grounded=True,
            model=research_res.model,
            request_id=req_id,
        )


def get_qa_service(
    ai_service: BaseAIService = Depends(get_ai_service),
    research_service: WebResearchService = Depends(get_web_research_service),
    activity_service: ActivityService = Depends(get_activity_service),
) -> QAService:
    """FastAPI dependency provider for QAService injecting BaseAIService, WebResearchService, and ActivityService."""
    return QAService(
        ai_service=ai_service,
        research_service=research_service,
        activity_service=activity_service,
    )

