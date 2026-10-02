"""Quiz Generation endpoint route handler."""

from fastapi import APIRouter, Depends, Request, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.quiz import QuizRequest, QuizResponse
from app.services.quiz_service import QuizService, get_quiz_service

router = APIRouter()


@router.post(
    "/quiz",
    response_model=QuizResponse,
    status_code=status.HTTP_200_OK,
    summary="Adaptive Quiz Generation",
    description="Generate structured multiple-choice assessment questions from study text with answer rationales.",
    tags=["Educational AI"],
)
async def generate_quiz(
    request: Request,
    payload: QuizRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> QuizResponse:
    """Thin route handler delegating to QuizService for authenticated users."""
    req_id = getattr(request.state, "request_id", None)
    return await service.process_quiz(request=payload, request_id=req_id, user=user)
