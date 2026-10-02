"""Centralized Google Gemini client and resilient execution manager."""

import asyncio
import logging
from typing import Any, Dict, Optional

from app.core.config import Settings, get_settings
from app.core.exceptions import (
    AIAuthenticationError,
    AIConfigurationError,
    AIProviderError,
    AIRateLimitedError,
    AITimeoutError,
)

logger = logging.getLogger("edugenie.gemini.client")

# Standard operation timeout in seconds
DEFAULT_GEMINI_TIMEOUT_SECONDS = 35.0
MAX_TRANSIENT_RETRIES = 2
INITIAL_RETRY_DELAY = 1.0


class GeminiClientManager:
    """Manages Google GenAI SDK client lifecycle, timeouts, retries, and error mapping."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self._client: Optional[Any] = None

    @property
    def model_name(self) -> str:
        """Validate and return the configured Gemini model name."""
        model = self.settings.GEMINI_MODEL
        if not model or not model.strip():
            raise AIConfigurationError(
                "GEMINI_MODEL is missing or not configured in environment variables. "
                "Please configure a valid Gemini model (e.g., gemini-2.5-flash)."
            )
        return model.strip()

    def get_client(self) -> Any:
        """Lazily initialize Google GenAI SDK client with validated API key."""
        api_key = self.settings.GEMINI_API_KEY
        if not api_key or not api_key.strip():
            raise AIConfigurationError(
                "GEMINI_API_KEY is not configured in backend environment variables. "
                "Please set a valid GEMINI_API_KEY in your .env file."
            )

        # Validate model presence before client usage
        _ = self.model_name

        if self._client is None:
            try:
                from google import genai

                self._client = genai.Client(api_key=api_key.strip())
                logger.info(
                    "Initialized Google GenAI client successfully with model: %s",
                    self.model_name,
                )
            except Exception as exc:
                logger.error("Failed to initialize Google GenAI client.")
                raise AIConfigurationError(
                    "Failed to initialize Google GenAI client. Please check backend configuration."
                ) from exc

        return self._client

    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        response_mime_type: Optional[str] = None,
        timeout_seconds: float = DEFAULT_GEMINI_TIMEOUT_SECONDS,
    ) -> str:
        """Execute content generation via Gemini with bounded retries and timeout control."""
        client = self.get_client()
        model = self.model_name

        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_instruction,
            response_mime_type=response_mime_type,
        )

        candidate_models = [self.model_name]
        for fallback in [
            "gemini-3.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite-preview",
            "gemini-flash-lite-latest",
        ]:
            if fallback != self.model_name and fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error: Optional[Exception] = None
        per_model_timeout = min(timeout_seconds, 15.0)

        for current_model in candidate_models:
            try:
                config_kwargs: Dict[str, Any] = {
                    "temperature": temperature,
                    "system_instruction": system_instruction,
                    "response_mime_type": response_mime_type,
                }
                # For models with thinking budget (like gemini-3.1-flash-lite), set thinking_budget=0 for instant response
                if "3.1" in current_model and "flash" in current_model:
                    try:
                        config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
                    except Exception:
                        pass

                config = types.GenerateContentConfig(**config_kwargs)

                # Wrap execution in responsive timeout
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=current_model,
                        contents=prompt,
                        config=config,
                    ),
                    timeout=per_model_timeout,
                )

                if not response or not response.text:
                    logger.warning("[%s] Gemini returned empty response", current_model)
                    raise AIProviderError("Gemini generated an empty response.")

                if current_model != self.model_name:
                    logger.info("Successfully used fallback model: %s", current_model)

                return response.text

            except asyncio.TimeoutError:
                logger.warning("[%s] Model timed out after %.1fs. Failing over to next candidate model...", current_model, per_model_timeout)
                last_error = AITimeoutError(
                    f"AI generation request timed out after {int(per_model_timeout)}s. Please try again."
                )
                continue

            except Exception as exc:
                categorized = self._categorize_exception(exc)
                last_error = categorized

                # Do NOT retry non-transient auth or config errors
                if isinstance(categorized, (AIAuthenticationError, AIConfigurationError)):
                    raise categorized from None

                # For 503, high demand, rate limits, or transient provider errors: rapidly failover to next model
                logger.warning("[%s] AI error (%s: %s). Rapidly switching to next model candidate...", current_model, type(exc).__name__, str(exc)[:80])
                continue

        raise last_error or AIProviderError("Failed to complete Gemini request across available models.")

    def _categorize_exception(self, exc: Exception) -> Exception:
        """Map provider exceptions to controlled EduGenie error hierarchy without leaking secrets."""
        exc_str = str(exc).lower()

        # Check for authentication / authorization failures (401, 403, invalid key, service blocked)
        if any(term in exc_str for term in ["permission_denied", "api_key_invalid", "api key not valid", "403", "401", "blocked"]):
            logger.error("Gemini authentication or authorization failure: %s", str(exc)[:120])
            return AIAuthenticationError(
                "Gemini API authentication failed. Please verify API key configuration and service permissions."
            )

        # Check for rate limiting / quota limits (429, quota exceeded, resource exhausted)
        if any(term in exc_str for term in ["resource_exhausted", "quota", "rate_limit", "rate limit", "429"]):
            logger.warning("Gemini API rate limit or quota exceeded: %s", str(exc)[:120])
            return AIRateLimitedError(
                "Gemini API quota or rate limit has been exceeded. Please wait a moment and try again."
            )

        # Check for timeouts
        if isinstance(exc, asyncio.TimeoutError) or "timeout" in exc_str or "deadline_exceeded" in exc_str:
            return AITimeoutError("Gemini request timed out. Please try again.")

        # Generic upstream provider error
        logger.error("Gemini provider error occurred: %s", str(exc)[:200])
        return AIProviderError(
            "An error occurred while communicating with the AI provider. Please try again later."
        )


_gemini_client_manager: Optional[GeminiClientManager] = None


def get_gemini_client_manager() -> GeminiClientManager:
    """Singleton provider for GeminiClientManager."""
    global _gemini_client_manager
    if _gemini_client_manager is None:
        _gemini_client_manager = GeminiClientManager()
    return _gemini_client_manager
