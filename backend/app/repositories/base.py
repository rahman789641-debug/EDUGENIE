"""Abstract repository interface for Learning Activity persistence."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.activity import ActivityCreate, LearningActivityItem


class BaseActivityRepository(ABC):
    """Abstract contract for learning activity persistence."""

    @abstractmethod
    async def record_activity(self, activity: ActivityCreate) -> LearningActivityItem:
        """Persist a new learning activity record."""
        pass

    @abstractmethod
    async def get_user_activities(
        self,
        user_id: str,
        activity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[LearningActivityItem], int]:
        """Fetch paginated learning activities for an authenticated user, returning (items, total_count)."""
        pass

    @abstractmethod
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Fetch aggregated activity metrics for an authenticated user."""
        pass

    @abstractmethod
    async def get_recent_activities(self, user_id: str, limit: int = 5) -> List[LearningActivityItem]:
        """Fetch the most recent learning activities for an authenticated user."""
        pass

    @abstractmethod
    async def delete_activity(self, user_id: str, activity_id: str) -> bool:
        """Delete a learning activity record strictly owned by user_id."""
        pass
