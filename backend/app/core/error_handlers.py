"""Centralized exception handlers for FastAPI with Request ID tracking."""

import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException

logger = logging.getLogger("edugenie.exceptions")


def get_request_id(request: Request) -> Optional[str]:
    """Safely extract request ID from request state or header."""
    return getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")


def format_error_response(
    code: str,
    message: str,
    request_id: Optional[str] = None,
    details: Any = None,
) -> Dict[str, Any]:
    """Helper to structure uniform JSON error responses according to production standards."""
    error_payload: Dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if request_id:
        error_payload["request_id"] = request_id
    if details is not None:
        error_payload["details"] = details

    return {"error": error_payload}


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application domain exceptions."""
    req_id = get_request_id(request)
    logger.warning(
        "[%s] Domain exception: %s [%s] on %s",
        req_id or "NO_ID",
        exc.message,
        exc.error_code,
        request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(
            code=exc.error_code,
            message=exc.message,
            request_id=req_id,
            details=exc.details or None,
        ),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle incoming request payload/parameter validation failures (HTTP 422)."""
    req_id = get_request_id(request)
    details: List[Dict[str, Any]] = []
    for err in exc.errors():
        field_loc = " -> ".join(str(loc) for loc in err.get("loc", []))
        details.append({
            "field": field_loc,
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error"),
        })

    logger.info("[%s] Validation error on %s: %s", req_id or "NO_ID", request.url.path, details)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=format_error_response(
            code="VALIDATION_ERROR",
            message="Request input validation failed. Please check the provided parameters.",
            request_id=req_id,
            details={"errors": details},
        ),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard HTTP exceptions with consistent error envelope."""
    req_id = get_request_id(request)
    logger.info("[%s] HTTP %d on %s: %s", req_id or "NO_ID", exc.status_code, request.url.path, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            request_id=req_id,
        ),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unhandled server errors (500). Hides stack traces in production."""
    req_id = get_request_id(request)
    logger.exception("[%s] Unhandled exception on %s: %s", req_id or "NO_ID", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please try again later.",
            request_id=req_id,
        ),
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register all centralized exception handlers to the FastAPI app."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
