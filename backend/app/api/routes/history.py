"""Learning activity history endpoint route handler."""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import ResourceNotFoundError
from app.schemas.activity import ActivityListResponse
from app.services.activity_service import ActivityService, get_activity_service

router = APIRouter()


@router.get(
    "/history",
    response_model=ActivityListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get User Learning Activity History",
    description="Retrieve paginated, chronologically ordered learning activities strictly for the authenticated user.",
    tags=["Learning History"],
)
async def get_learning_history(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Number of items per page"),
    activity_type: Optional[str] = Query(default=None, description="Filter by activity type (qa, explain, quiz, summarize, learning_path, research)"),
    user: AuthenticatedUser = Depends(get_current_user),
    service: ActivityService = Depends(get_activity_service),
) -> ActivityListResponse:
    """Fetch learning history strictly filtered by authenticated user UID."""
    return await service.get_user_history(
        user_id=user.uid,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )


@router.delete(
    "/history/{activity_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete User Learning Activity Item",
    description="Delete a specific learning activity strictly owned by the authenticated user.",
    tags=["Learning History"],
)
async def delete_learning_activity(
    activity_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    service: ActivityService = Depends(get_activity_service),
) -> dict:
    """Delete learning activity record strictly owned by the authenticated user."""
    deleted = await service.delete_user_activity(user_id=user.uid, activity_id=activity_id)
    if not deleted:
        raise ResourceNotFoundError(resource="Activity", identifier=activity_id)
    return {"status": "ok", "deleted": True, "activity_id": activity_id}
