"""FastAPI Application Factory for EDUGENIE."""

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import Response

from app.api.router import api_v1_router, compatibility_router
from app.api.routes.health import get_health
from app.core.config import Settings, get_settings
from app.core.error_handlers import format_error_response, register_error_handlers
from app.core.logging import setup_logging
from app.core.rate_limiter import rate_limiter
from app.utils.helpers import generate_request_id, sanitize_request_id


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown hooks."""
    settings = get_settings()
    setup_logging(log_level=settings.LOG_LEVEL)
    logger = logging.getLogger("edugenie.lifecycle")

    # Validate production configuration if running in production
    settings.validate_production_configuration()

    logger.info("Starting %s in %s environment...", settings.APP_NAME, settings.APP_ENV)
    logger.info("Canonical API Version: %s", settings.API_V1_PREFIX)
    logger.info("Allowed CORS Origins: %s", settings.CORS_ORIGINS)
    logger.info("Configured Gemini Model: %s", settings.GEMINI_MODEL)
    logger.info("Gemini API Key configured: %s", "YES" if settings.is_gemini_configured else "NO")

    yield

    logger.info("Shutting down %s...", settings.APP_NAME)


def create_app(custom_settings: Settings = None) -> FastAPI:
    """FastAPI application factory."""
    settings = custom_settings or get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        description="Google Gemini Powered Learning Assistant Backend API",
        version="0.2.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Configure Cross-Origin Resource Sharing (CORS) centrally
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Performance, Request ID, and Security Headers Middleware
    @app.middleware("http")
    async def request_middleware(request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        logger = logging.getLogger("edugenie.http")

        # 1. Request ID Handling
        raw_req_id = request.headers.get("X-Request-ID")
        req_id = sanitize_request_id(raw_req_id) or generate_request_id()
        request.state.request_id = req_id

        # 2. Request Payload Size Validation
        content_length_str = request.headers.get("content-length")
        if content_length_str:
            try:
                content_length = int(content_length_str)
                if content_length > settings.MAX_REQUEST_BODY_BYTES:
                    logger.warning(
                        "[%s] Request body rejected: %d bytes exceeds max %d bytes",
                        req_id,
                        content_length,
                        settings.MAX_REQUEST_BODY_BYTES,
                    )
                    return JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        content=format_error_response(
                            code="PAYLOAD_TOO_LARGE",
                            message=f"Request body exceeds maximum allowed size of {settings.MAX_REQUEST_BODY_BYTES} bytes.",
                            request_id=req_id,
                        ),
                    )
            except ValueError:
                pass

        # 3. Rate Limiting / Abuse Protection
        rate_limit_headers = {}
        if settings.RATE_LIMIT_ENABLED and request.method != "OPTIONS":
            path = request.url.path
            is_health_endpoint = path in ("/health", "/api/health", f"{settings.API_V1_PREFIX}/health")
            if not is_health_endpoint:
                is_ai_path = any(
                    path.startswith(f"{settings.API_V1_PREFIX}/{sub}")
                    for sub in ("qa", "explain", "quiz", "summarize", "learn", "research")
                )
                limit = settings.RATE_LIMIT_AI_PER_MINUTE if is_ai_path else settings.RATE_LIMIT_STANDARD_PER_MINUTE
                client_ip = (
                    request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                    or (request.client.host if request.client else "unknown")
                )
                rate_key = f"{client_ip}:{path}"
                allowed, remaining, retry_after = await rate_limiter.check(rate_key, limit)
                if not allowed:
                    logger.warning(
                        "[%s] Rate limit exceeded for %s on %s (limit: %d/min)",
                        req_id,
                        client_ip,
                        path,
                        limit,
                    )
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content=format_error_response(
                            code="RATE_LIMIT_EXCEEDED",
                            message="Rate limit exceeded. Please wait before submitting more requests.",
                            request_id=req_id,
                        ),
                        headers={
                            "Retry-After": str(retry_after),
                            "X-RateLimit-Limit": str(limit),
                            "X-RateLimit-Remaining": "0",
                        },
                    )
                rate_limit_headers["X-RateLimit-Limit"] = str(limit)
                rate_limit_headers["X-RateLimit-Remaining"] = str(remaining)

        # 4. Process Request
        response = await call_next(request)

        # 5. Inject Tracing, Rate Limiting, and Performance Headers
        process_time_ms = (time.perf_counter() - start_time) * 1000.0
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"
        for h_key, h_val in rate_limit_headers.items():
            response.headers[h_key] = h_val

        # 5. Inject Standard Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 6. Structured Access Logging (No passwords or API keys logged)
        logger.info(
            "[%s] %s %s -> HTTP %d (%.2fms)",
            req_id,
            request.method,
            request.url.path,
            response.status_code,
            process_time_ms,
        )
        return response

    # Register centralized exception handlers
    register_error_handlers(app)

    # Mount Canonical v1 Router (/api/v1)
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    # Mount Compatibility Router (/api/health)
    app.include_router(compatibility_router, prefix="/api", include_in_schema=False)

    # Root health probe alias for container/orchestrator liveness (/health)
    @app.get("/health", include_in_schema=False)
    async def root_health_alias():
        return await get_health()

    return app


# Application entry point for ASGI servers (uvicorn)
app = create_app()
