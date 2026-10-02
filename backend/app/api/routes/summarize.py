"""Text and Lecture Summarization endpoint route handler."""

from fastapi import APIRouter, Depends, Request, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.summary_service import SummaryService, get_summary_service

router = APIRouter()


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Text & Lecture Summarization",
    description="Distill long educational texts, chapters, or lecture transcripts into structured study notes.",
    tags=["Educational AI"],
)
async def summarize_text(
    request: Request,
    payload: SummarizeRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: SummaryService = Depends(get_summary_service),
) -> SummarizeResponse:
    """Thin route handler delegating to SummaryService for authenticated users."""
    req_id = getattr(request.state, "request_id", None)
    return await service.process_summary(request=payload, request_id=req_id, user=user)
