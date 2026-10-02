"""Thread-safe SQLite repository implementation for Learning Activity persistence."""

import asyncio
import json
import logging
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.repositories.base import BaseActivityRepository
from app.schemas.activity import ActivityCreate, ActivityType, LearningActivityItem

logger = logging.getLogger("edugenie.repository.activity")


class SQLiteActivityRepository(BaseActivityRepository):
    """Production-grade, thread-safe SQLite implementation of BaseActivityRepository."""

    def __init__(self, db_path: str = "data/edugenie.db") -> None:
        self.db_path = db_path
        self._is_memory = db_path == ":memory:"
        self._memory_conn: Optional[sqlite3.Connection] = None
        self._lock = threading.Lock()

        if not self._is_memory:
            # Ensure parent directories exist
            path_obj = Path(db_path)
            path_obj.parent.mkdir(parents=True, exist_ok=True)

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Provide a SQLite connection. If in-memory, retain single connection; otherwise connect."""
        if self._is_memory:
            if self._memory_conn is None:
                self._memory_conn = sqlite3.connect(":memory:", check_same_thread=False)
            return self._memory_conn

        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self) -> None:
        """Create table and indexes if they do not exist."""
        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS learning_activities (
                            id TEXT PRIMARY KEY,
                            user_id TEXT NOT NULL,
                            activity_type TEXT NOT NULL,
                            title TEXT NOT NULL,
                            created_at TEXT NOT NULL,
                            metadata TEXT NOT NULL DEFAULT '{}'
                        );
                        """
                    )
                    conn.execute(
                        "CREATE INDEX IF NOT EXISTS idx_user_created ON learning_activities(user_id, created_at DESC);"
                    )
                    conn.execute(
                        "CREATE INDEX IF NOT EXISTS idx_user_type ON learning_activities(user_id, activity_type);"
                    )
            finally:
                if not self._is_memory:
                    conn.close()

    async def record_activity(self, activity: ActivityCreate) -> LearningActivityItem:
        """Persist a newly completed learning activity."""
        return await asyncio.to_thread(self._sync_record_activity, activity)

    def _sync_record_activity(self, activity: ActivityCreate) -> LearningActivityItem:
        act_id = f"act-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        metadata_json = json.dumps(activity.metadata or {})

        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    conn.execute(
                        """
                        INSERT INTO learning_activities (id, user_id, activity_type, title, created_at, metadata)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (act_id, activity.user_id, activity.activity_type.value, activity.title, now_iso, metadata_json),
                    )
                logger.info(
                    "Recorded learning activity %s (type: %s) for user %s",
                    act_id,
                    activity.activity_type.value,
                    activity.user_id[:4] + "..." if len(activity.user_id) > 4 else activity.user_id,
                )
                return LearningActivityItem(
                    id=act_id,
                    user_id=activity.user_id,
                    activity_type=activity.activity_type,
                    title=activity.title,
                    created_at=now_iso,
                    metadata=activity.metadata or {},
                )
            finally:
                if not self._is_memory:
                    conn.close()

    async def get_user_activities(
        self,
        user_id: str,
        activity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[LearningActivityItem], int]:
        """Fetch paginated learning activities for an authenticated user."""
        return await asyncio.to_thread(self._sync_get_user_activities, user_id, activity_type, page, page_size)

    def _sync_get_user_activities(
        self,
        user_id: str,
        activity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[LearningActivityItem], int]:
        offset = (page - 1) * page_size

        with self._lock:
            conn = self._get_connection()
            try:
                # 1. Total count
                if activity_type:
                    cursor = conn.execute(
                        "SELECT COUNT(*) FROM learning_activities WHERE user_id = ? AND activity_type = ?",
                        (user_id, activity_type),
                    )
                else:
                    cursor = conn.execute(
                        "SELECT COUNT(*) FROM learning_activities WHERE user_id = ?",
                        (user_id,),
                    )
                total = cursor.fetchone()[0]

                if total == 0:
                    return [], 0

                # 2. Paginated rows
                if activity_type:
                    cursor = conn.execute(
                        """
                        SELECT id, user_id, activity_type, title, created_at, metadata
                        FROM learning_activities
                        WHERE user_id = ? AND activity_type = ?
                        ORDER BY created_at DESC
                        LIMIT ? OFFSET ?
                        """,
                        (user_id, activity_type, page_size, offset),
                    )
                else:
                    cursor = conn.execute(
                        """
                        SELECT id, user_id, activity_type, title, created_at, metadata
                        FROM learning_activities
                        WHERE user_id = ?
                        ORDER BY created_at DESC
                        LIMIT ? OFFSET ?
                        """,
                        (user_id, page_size, offset),
                    )

                items: List[LearningActivityItem] = []
                for row in cursor.fetchall():
                    try:
                        meta = json.loads(row[5]) if row[5] else {}
                    except Exception:
                        meta = {}

                    items.append(
                        LearningActivityItem(
                            id=row[0],
                            user_id=row[1],
                            activity_type=ActivityType(row[2]),
                            title=row[3],
                            created_at=row[4],
                            metadata=meta,
                        )
                    )

                return items, total
            finally:
                if not self._is_memory:
                    conn.close()

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Fetch aggregated metrics for an authenticated user in a single query."""
        return await asyncio.to_thread(self._sync_get_user_stats, user_id)

    def _sync_get_user_stats(self, user_id: str) -> Dict[str, Any]:
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    """
                    SELECT activity_type, COUNT(*)
                    FROM learning_activities
                    WHERE user_id = ?
                    GROUP BY activity_type
                    """,
                    (user_id,),
                )
                counts_by_type = {row[0]: row[1] for row in cursor.fetchall()}

                qa_count = counts_by_type.get(ActivityType.QA.value, 0)
                explain_count = counts_by_type.get(ActivityType.EXPLAIN.value, 0)
                quiz_count = counts_by_type.get(ActivityType.QUIZ.value, 0)
                summary_count = counts_by_type.get(ActivityType.SUMMARIZE.value, 0)
                learning_path_count = counts_by_type.get(ActivityType.LEARNING_PATH.value, 0)
                research_count = counts_by_type.get(ActivityType.RESEARCH.value, 0)

                total_activities = sum(counts_by_type.values())

                return {
                    "total_activities": total_activities,
                    "questions_asked": qa_count,
                    "explanations_generated": explain_count,
                    "quizzes_completed": quiz_count,
                    "summaries_generated": summary_count,
                    "learning_paths_generated": learning_path_count,
                    "research_queries": research_count,
                    "quiz_stats": {
                        "total_quizzes": quiz_count,
                    }
                    if quiz_count > 0
                    else None,
                }
            finally:
                if not self._is_memory:
                    conn.close()

    async def get_recent_activities(self, user_id: str, limit: int = 5) -> List[LearningActivityItem]:
        """Fetch newest activities for dashboard overview."""
        return await asyncio.to_thread(self._sync_get_recent_activities, user_id, limit)

    def _sync_get_recent_activities(self, user_id: str, limit: int = 5) -> List[LearningActivityItem]:
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    """
                    SELECT id, user_id, activity_type, title, created_at, metadata
                    FROM learning_activities
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (user_id, limit),
                )
                items: List[LearningActivityItem] = []
                for row in cursor.fetchall():
                    try:
                        meta = json.loads(row[5]) if row[5] else {}
                    except Exception:
                        meta = {}
                    items.append(
                        LearningActivityItem(
                            id=row[0],
                            user_id=row[1],
                            activity_type=ActivityType(row[2]),
                            title=row[3],
                            created_at=row[4],
                            metadata=meta,
                        )
                    )
                return items
            finally:
                if not self._is_memory:
                    conn.close()

    async def delete_activity(self, user_id: str, activity_id: str) -> bool:
        """Delete an activity owned by user_id."""
        return await asyncio.to_thread(self._sync_delete_activity, user_id, activity_id)

    def _sync_delete_activity(self, user_id: str, activity_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            try:
                with conn:
                    cursor = conn.execute(
                        "DELETE FROM learning_activities WHERE id = ? AND user_id = ?",
                        (activity_id, user_id),
                    )
                    return cursor.rowcount > 0
            finally:
                if not self._is_memory:
                    conn.close()
