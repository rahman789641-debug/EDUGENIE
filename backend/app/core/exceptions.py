"""Domain and HTTP exception hierarchy for EDUGENIE."""

from typing import Any, Dict, Optional


class AppException(Exception):
    """Base application exception for all domain-specific errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        error_code: str = "APPLICATION_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class ResourceNotFoundError(AppException):
    """Raised when an entity, document, or resource is not found."""

    def __init__(self, resource: str, identifier: Any, details: Optional[Dict[str, Any]] = None) -> None:
        message = f"{resource} with identifier '{identifier}' was not found."
        super().__init__(
            message=message,
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            details=details,
        )


class BadRequestError(AppException):
    """Raised when incoming parameters or request payload are invalid."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=400,
            error_code="BAD_REQUEST",
            details=details,
        )


class AIServiceNotConfiguredError(AppException):
    """Raised when an AI endpoint is called before the Gemini integration is configured."""

    def __init__(
        self,
        message: str = "AI service is not configured. Google Gemini integration is scheduled for Step 4.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=503,
            error_code="AI_SERVICE_NOT_CONFIGURED",
            details=details,
        )


class AIServiceError(AppException):
    """Raised when Gemini or upstream AI orchestration encounters an error."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_code="AI_SERVICE_ERROR",
            details=details,
        )


class ConfigurationError(AppException):
    """Raised when critical configuration is missing or malformed."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=500,
            error_code="CONFIGURATION_ERROR",
            details=details,
        )


class AIConfigurationError(AppException):
    """Raised when critical AI configuration (such as GEMINI_MODEL or GEMINI_API_KEY) is missing."""

    def __init__(self, message: str = "AI service configuration is missing or incomplete.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=500,
            error_code="AI_CONFIGURATION_ERROR",
            details=details,
        )


class AIAuthenticationError(AppException):
    """Raised when Gemini API authentication or permissions fail."""

    def __init__(self, message: str = "Failed to authenticate with AI provider.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_code="AI_AUTHENTICATION_ERROR",
            details=details,
        )


class AIRateLimitedError(AppException):
    """Raised when Gemini quota or rate limits are exceeded."""

    def __init__(self, message: str = "AI service is currently rate limited. Please try again later.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=429,
            error_code="AI_RATE_LIMITED",
            details=details,
        )


AIRateLimitError = AIRateLimitedError



class AITimeoutError(AppException):
    """Raised when Gemini request exceeds the configured timeout."""

    def __init__(self, message: str = "AI generation request timed out. Please try again.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=504,
            error_code="AI_TIMEOUT",
            details=details,
        )


class AIProviderError(AppException):
    """Raised when Gemini encounters an upstream provider or network failure."""

    def __init__(self, message: str = "Upstream AI provider error occurred.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_code="AI_PROVIDER_ERROR",
            details=details,
        )


class AIGenerationError(AppException):
    """Raised when Gemini returns malformed or unverifiable structured generation output."""

    def __init__(self, message: str = "AI generation failed to produce valid structured educational output.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_code="AI_GENERATION_ERROR",
            details=details,
        )


class PayloadTooLargeError(AppException):
    """Raised when request body exceeds maximum allowed size."""

    def __init__(
        self,
        message: str = "Request payload exceeds permitted maximum size.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=413,
            error_code="PAYLOAD_TOO_LARGE",
            details=details,
        )


class RateLimitExceededError(AppException):
    """Raised when request rate exceeds rate-limiting thresholds."""

    def __init__(
        self,
        message: str = "Rate limit exceeded. Please throttle your requests.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED",
            details=details,
        )


class AuthenticationRequiredError(AppException):
    """Raised when an unauthenticated request attempts to access an authenticated endpoint."""

    def __init__(
        self,
        message: str = "Authentication required. Please provide a valid Firebase bearer token.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=401,
            error_code="AUTHENTICATION_REQUIRED",
            details=details,
        )


class InvalidTokenError(AppException):
    """Raised when the provided authentication token is invalid or malformed."""

    def __init__(
        self,
        message: str = "Invalid authentication token. Please sign in again.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=401,
            error_code="INVALID_TOKEN",
            details=details,
        )


class SessionExpiredError(AppException):
    """Raised when the provided authentication token has expired."""

    def __init__(
        self,
        message: str = "Your session has expired. Please sign in again.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=401,
            error_code="SESSION_EXPIRED",
            details=details,
        )
