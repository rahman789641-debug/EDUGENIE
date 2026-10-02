"""Service orchestrator for user learning activities and dashboard intelligence."""

import logging
import math
from typing import Any, Dict, Optional

from fastapi import Depends

from app.core.exceptions import BadRequestError
from app.repositories import BaseActivityRepository, get_activity_repository
from app.schemas.activity import (
    ActivityCreate,
    ActivityListResponse,
    ActivityType,
    DashboardStatsResponse,
    LearningActivityItem,
)
from app.services.base import BaseService

logger = logging.getLogger("edugenie.services.activity")

VALID_ACTIVITY_TYPES = {t.value for t in ActivityType}


class ActivityService(BaseService):
    """Business service managing learning activity recording, user history, and metrics."""

    def __init__(self, repository: BaseActivityRepository) -> None:
        super().__init__(service_name="ActivityService")
        self.repository = repository

    async def record_activity(
        self,
        user_id: str,
        activity_type: ActivityType,
        title: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[LearningActivityItem]:
        """Safely record a completed learning activity.

        Design Rule: Activity recording MUST NEVER break or delay primary AI responses.
        If persistence fails, the error is safely logged without bubbling up.
        """
        if not user_id or not user_id.strip():
            self.logger.warning("Attempted to record activity without user_id; skipping.")
            return None

        # Sanitize metadata: strictly exclude sensitive keys, passwords, tokens
        clean_metadata: Dict[str, Any] = {}
        if metadata and isinstance(metadata, dict):
            for k, v in metadata.items():
                k_lower = str(k).lower()
                if any(sec in k_lower for sec in ("token", "key", "password", "secret", "auth", "credential")):
                    continue
                # Skip large nested bodies
                if isinstance(v, (dict, list)) and len(str(v)) > 2000:
                    continue
                clean_metadata[str(k)] = v

        try:
            item = await self.repository.record_activity(
                ActivityCreate(
                    user_id=user_id.strip(),
                    activity_type=activity_type,
                    title=title.strip() if title else f"Learning Activity: {activity_type.value}",
                    metadata=clean_metadata,
                )
            )
            return item
        except Exception as exc:
            self.logger.error("Failed to record learning activity safely: %s", exc)
            return None

    async def get_user_history(
        self,
        user_id: str,
        activity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> ActivityListResponse:
        """Fetch paginated, filtered learning history strictly for the authenticated user."""
        if not user_id or not user_id.strip():
            raise BadRequestError("Authenticated user UID is required.")

        # Parameter validation
        if page < 1:
            raise BadRequestError("Page parameter must be an integer >= 1.")
        if page_size < 1 or page_size > 100:
            raise BadRequestError("Page size parameter must be between 1 and 100.")

        clean_type: Optional[str] = None
        if activity_type:
            t = activity_type.strip().lower()
            if t not in VALID_ACTIVITY_TYPES:
                raise BadRequestError(
                    f"Invalid activity_type '{activity_type}'. Allowed types: {', '.join(sorted(VALID_ACTIVITY_TYPES))}"
                )
            clean_type = t

        items, total = await self.repository.get_user_activities(
            user_id=user_id.strip(),
            activity_type=clean_type,
            page=page,
            page_size=page_size,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 0

        return ActivityListResponse(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )

    async def get_dashboard_stats(self, user_id: str) -> DashboardStatsResponse:
        """Fetch aggregated metrics and recent 5 activities for the authenticated user."""
        if not user_id or not user_id.strip():
            raise BadRequestError("Authenticated user UID is required.")

        stats = await self.repository.get_user_stats(user_id=user_id.strip())
        recent = await self.repository.get_recent_activities(user_id=user_id.strip(), limit=5)

        return DashboardStatsResponse(
            total_activities=stats.get("total_activities", 0),
            questions_asked=stats.get("questions_asked", 0),
            explanations_generated=stats.get("explanations_generated", 0),
            quizzes_completed=stats.get("quizzes_completed", 0),
            summaries_generated=stats.get("summaries_generated", 0),
            learning_paths_generated=stats.get("learning_paths_generated", 0),
            research_queries=stats.get("research_queries", 0),
            quiz_stats=stats.get("quiz_stats"),
            recent_activities=recent,
        )

    async def delete_user_activity(self, user_id: str, activity_id: str) -> bool:
        """Delete an activity record strictly owned by authenticated user."""
        if not user_id or not user_id.strip() or not activity_id or not activity_id.strip():
            raise BadRequestError("user_id and activity_id are required.")
        return await self.repository.delete_activity(user_id=user_id.strip(), activity_id=activity_id.strip())


def get_activity_service(
    repository: BaseActivityRepository = Depends(get_activity_repository),
) -> ActivityService:
    """FastAPI dependency provider for ActivityService."""
    return ActivityService(repository=repository)
