"""FastAPI application entrypoint for Vercel deployment and ASGI runners."""

from app.main import app

__all__ = ["app"]
