"""Dashboard intelligence and metrics endpoint route handler."""

from fastapi import APIRouter, Depends, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.activity import DashboardStatsResponse
from app.services.activity_service import ActivityService, get_activity_service

router = APIRouter()


@router.get(
    "/dashboard/stats",
    response_model=DashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get User Learning Dashboard Metrics",
    description="Retrieve aggregated learning statistics and recent activities for the authenticated user.",
    tags=["Dashboard Intelligence"],
)
async def get_dashboard_metrics(
    user: AuthenticatedUser = Depends(get_current_user),
    service: ActivityService = Depends(get_activity_service),
) -> DashboardStatsResponse:
    """Fetch dashboard statistics strictly for the authenticated user."""
    return await service.get_dashboard_stats(user_id=user.uid)
