"""Main API router combining v1 routes and compatibility endpoints."""

from fastapi import APIRouter
from app.api.routes import (
    dashboard,
    explain,
    health,
    history,
    learning_path,
    qa,
    quiz,
    research,
    summarize,
)

api_v1_router = APIRouter()

# Mount canonical v1 routes
api_v1_router.include_router(health.router)
api_v1_router.include_router(qa.router)
api_v1_router.include_router(explain.router)
api_v1_router.include_router(quiz.router)
api_v1_router.include_router(summarize.router)
api_v1_router.include_router(learning_path.router)
api_v1_router.include_router(research.router)
api_v1_router.include_router(history.router)
api_v1_router.include_router(dashboard.router)


# Compatibility router for /api/health
compatibility_router = APIRouter()
compatibility_router.include_router(health.router)
