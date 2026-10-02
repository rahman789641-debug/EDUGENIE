"""Central AI Service provider for EDUGENIE.

In Step 4, provides the production Google Gemini AI orchestrator.
Preserves dependency injection interfaces for clean unit testing and mock substitution.
"""

from functools import lru_cache
from typing import Optional

from app.core.config import Settings, get_settings
from app.services.ai.base import BaseAIService
from app.services.ai.gemini_service import GeminiService, get_gemini_service

# Backward-compatible alias
AIService = GeminiService


@lru_cache()
def get_ai_service() -> BaseAIService:
    """Dependency provider returning singleton GeminiService instance."""
    return get_gemini_service()


__all__ = ["BaseAIService", "AIService", "GeminiService", "get_ai_service"]
