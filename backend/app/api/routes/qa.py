"""Educational Q&A endpoint route handler."""

from fastapi import APIRouter, Depends, Request, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.qa import QARequest, QAResponse
from app.services.qa_service import QAService, get_qa_service

router = APIRouter()


@router.post(
    "/qa",
    response_model=QAResponse,
    status_code=status.HTTP_200_OK,
    summary="Educational Question Answering",
    description="Answer educational questions with real Google Gemini AI for authenticated users.",
    tags=["Educational AI"],
)
async def ask_question(
    request: Request,
    payload: QARequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: QAService = Depends(get_qa_service),
) -> QAResponse:
    """Thin route handler delegating to QAService with verified user identity."""
    req_id = getattr(request.state, "request_id", None)
    return await service.process_qa(request=payload, request_id=req_id, user=user)
