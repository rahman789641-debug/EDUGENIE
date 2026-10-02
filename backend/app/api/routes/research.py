"""Web Research endpoint route handler."""

from fastapi import APIRouter, Depends, Request, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.research import ResearchRequest, ResearchResponse
from app.services.web_research_service import WebResearchService, get_web_research_service

router = APIRouter()


@router.post(
    "/research",
    response_model=ResearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Educational Web Research with Verified Sources",
    description="Conduct external web research, retrieve citations, and generate source-grounded educational answers.",
    tags=["Educational AI"],
)
async def conduct_web_research(
    request: Request,
    payload: ResearchRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: WebResearchService = Depends(get_web_research_service),
) -> ResearchResponse:
    """Thin route handler delegating to WebResearchService for authenticated users."""
    req_id = getattr(request.state, "request_id", None)
    return await service.conduct_research(request=payload, request_id=req_id, user=user)
