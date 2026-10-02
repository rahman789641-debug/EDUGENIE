"""Learning Path recommendations endpoint route handler."""

from fastapi import APIRouter, Depends, Request, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.learning_path import LearningPathRequest, LearningPathResponse
from app.services.learning_path_service import LearningPathService, get_learning_path_service

router = APIRouter()


@router.post(
    "/learn/recommendations",
    response_model=LearningPathResponse,
    status_code=status.HTTP_200_OK,
    summary="Personalized Learning Path Recommendations",
    description="Generate prerequisite-mapped milestone roadmaps personalized to student goals.",
    tags=["Educational AI"],
)
@router.post(
    "/learning-path",
    response_model=LearningPathResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def generate_learning_recommendations(
    request: Request,
    payload: LearningPathRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: LearningPathService = Depends(get_learning_path_service),
) -> LearningPathResponse:
    """Thin route handler delegating to LearningPathService with verified authentication."""
    req_id = getattr(request.state, "request_id", None)
    return await service.process_learning_path(request=payload, request_id=req_id, user=user)
