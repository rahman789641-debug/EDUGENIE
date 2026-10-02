"""Helper utilities for sanitization, request tracking, and text analytics."""

import re
import uuid
from typing import Optional


def generate_request_id() -> str:
    """Generate a clean, collision-resistant UUID4 request identifier."""
    return f"req-{uuid.uuid4().hex[:16]}"


def sanitize_request_id(incoming: Optional[str]) -> Optional[str]:
    """Validate incoming client request ID to ensure safe alphanumeric and hyphen chars."""
    if not incoming:
        return None
    incoming = incoming.strip()
    if 1 <= len(incoming) <= 64 and re.match(r"^[a-zA-Z0-9_\-]+$", incoming):
        return incoming
    return None


def count_words(text: str) -> int:
    """Count words in a string accurately across multiple whitespaces."""
    if not text:
        return 0
    return len(text.strip().split())


def truncate_for_logging(text: str, max_chars: int = 120) -> str:
    """Safely truncate user prompts for logging without leaking full sensitive payloads."""
    if not text:
        return ""
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_chars:
        return cleaned
    return f"{cleaned[:max_chars]}... [truncated {len(cleaned)} chars]"
