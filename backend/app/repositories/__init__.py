"""Persistence repository package for EduGenie."""

from typing import Optional

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.repositories.base import BaseActivityRepository
from app.repositories.sqlite_activity_repository import SQLiteActivityRepository

__all__ = [
    "BaseActivityRepository",
    "SQLiteActivityRepository",
    "get_activity_repository",
]

_repository_instance: Optional[BaseActivityRepository] = None


def get_activity_repository(settings: Settings = Depends(get_settings)) -> BaseActivityRepository:
    """Dependency provider for learning activity repository."""
    global _repository_instance
    if _repository_instance is None:
        _repository_instance = SQLiteActivityRepository(db_path=settings.DATABASE_PATH)
    return _repository_instance

