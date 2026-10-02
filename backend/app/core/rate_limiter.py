"""Lightweight, in-memory sliding-window rate limiter for abuse protection.

Prevents unbounded abuse on expensive AI and Web Research endpoints without requiring
external Redis or infrastructure dependencies. Thread-safe and non-blocking.
"""

import asyncio
import logging
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("edugenie.ratelimit")


class InMemoryRateLimiter:
    """Thread-safe sliding-window rate limiter."""

    def __init__(self, window_seconds: int = 60) -> None:
        self.window_seconds = window_seconds
        self._records: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()

    async def check(self, key: str, max_requests: int) -> Tuple[bool, int, int]:
        """Check whether a request for `key` is permitted.

        Returns:
            (allowed: bool, remaining_requests: int, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - self.window_seconds

        async with self._lock:
            # Periodic cleanup of stale keys every 5 minutes
            if now - self._last_cleanup > 300:
                self._cleanup(window_start)
                self._last_cleanup = now

            timestamps = self._records[key]
            # Retain only timestamps within the current sliding window
            active_timestamps = [t for t in timestamps if t > window_start]
            self._records[key] = active_timestamps

            if len(active_timestamps) >= max_requests:
                earliest = active_timestamps[0]
                retry_after = max(1, int(self.window_seconds - (now - earliest)))
                return False, 0, retry_after

            active_timestamps.append(now)
            remaining = max(0, max_requests - len(active_timestamps))
            return True, remaining, 0

    def _cleanup(self, window_start: float) -> None:
        """Prune idle keys to prevent memory leaks over long daemon uptimes."""
        stale_keys = [k for k, timestamps in self._records.items() if not timestamps or timestamps[-1] <= window_start]
        for k in stale_keys:
            del self._records[k]

    def reset(self) -> None:
        """Reset all rate limiter state (useful for automated test isolation)."""
        self._records.clear()


# Global singleton rate limiter instance
rate_limiter = InMemoryRateLimiter(window_seconds=60)
