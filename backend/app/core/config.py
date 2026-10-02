"""Centralized configuration management for EDUGENIE using Pydantic Settings."""

import json
from functools import lru_cache
from pathlib import Path
from typing import List, Union

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Determine root directory to locate .env file reliably
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

# Check potential .env locations in order of preference
ENV_FILE_PATHS = [
    ROOT_DIR / ".env",
    BACKEND_DIR / ".env",
]
env_file_to_use = next((p for p in ENV_FILE_PATHS if p.is_file()), ROOT_DIR / ".env")


class Settings(BaseSettings):
    """Application settings and environment validation."""

    model_config = SettingsConfigDict(
        env_file=str(env_file_to_use),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application Basics
    APP_NAME: str = Field(default="EDUGENIE", description="Application service name")
    APP_ENV: str = Field(default="development", description="Environment: development, test, staging, production")
    DEBUG: bool = Field(default=True, description="Debug mode flag")
    APP_HOST: str = Field(
        default="0.0.0.0",
        validation_alias=AliasChoices("APP_HOST", "HOST"),
        description="Server host binding",
    )
    APP_PORT: int = Field(
        default=8000,
        validation_alias=AliasChoices("APP_PORT", "PORT"),
        description="Server port binding",
    )
    API_V1_PREFIX: str = Field(default="/api/v1", description="Canonical v1 API prefix")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    MAX_REQUEST_BODY_BYTES: int = Field(
        default=1_048_576,  # 1 MB
        description="Maximum permitted request body size in bytes to prevent DoS attacks",
    )

    # Security & CORS
    CORS_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        validation_alias=AliasChoices("CORS_ORIGINS", "CORS_ALLOWED_ORIGINS"),
        description="Allowed CORS origins list or JSON-encoded / comma-separated string",
    )

    # Rate Limiting & Abuse Prevention
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description="Enable lightweight in-memory rate limiting across endpoints",
    )
    RATE_LIMIT_STANDARD_PER_MINUTE: int = Field(
        default=120,
        description="Max requests per minute for standard metadata/health endpoints",
    )
    RATE_LIMIT_AI_PER_MINUTE: int = Field(
        default=30,
        description="Max requests per minute for resource-intensive AI/Research endpoints",
    )

    # Google Gemini AI Integration (Configurable model, strictly backend isolated)
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API key. Must never be exposed to frontend clients.",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-3.1-flash-lite",
        description="Configurable Gemini model identifier to avoid hardcoded deprecations.",
    )

    # External Web Research Configuration (Backend-only, never exposed to clients)
    WEB_SEARCH_TIMEOUT_SECONDS: float = Field(
        default=8.0,
        description="Timeout in seconds for external web search queries",
    )
    MAX_SEARCH_RESULTS: int = Field(
        default=5,
        description="Maximum number of external search results to retrieve and ground",
    )
    TAVILY_API_KEY: str = Field(
        default="",
        description="Optional Tavily Search API key for dedicated search provider",
    )

    # Persistence & Learning History
    DATABASE_PATH: str = Field(
        default=str(BACKEND_DIR / "data" / "edugenie.db"),
        description="Path to SQLite database for learning activity history and persistence",
    )


    @field_validator("GEMINI_MODEL")
    @classmethod
    def validate_gemini_model(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("GEMINI_MODEL environment variable is missing or empty. Please set GEMINI_MODEL in your environment.")
        return v.strip()

    @field_validator("DATABASE_PATH", mode="before")
    @classmethod
    def assemble_database_path(cls, v: Union[str, None]) -> str:
        import os
        if os.environ.get("VERCEL"):
            return "/tmp/edugenie.db"
        return str(v) if v else str(BACKEND_DIR / "data" / "edugenie.db")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from a JSON array string, comma-separated list, or direct list."""
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    parsed = json.loads(v_trimmed)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            # Comma-separated fallback
            return [item.strip() for item in v_trimmed.split(",") if item.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []

    @property
    def is_production(self) -> bool:
        """Helper to check if running in production."""
        return self.APP_ENV.lower() == "production"

    @property
    def is_gemini_configured(self) -> bool:
        """Helper to verify if Gemini AI credentials are configured."""
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())

    # Firebase Admin Configuration (Backend authentication verification)
    FIREBASE_PROJECT_ID: str = Field(
        default="edugenie-eb3f5",
        validation_alias=AliasChoices("FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID", "GOOGLE_CLOUD_PROJECT"),
        description="Firebase Project ID for token signature and audience verification.",
    )
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: Union[str, None] = Field(
        default=None,
        validation_alias=AliasChoices(
            "FIREBASE_SERVICE_ACCOUNT_KEY_PATH",
            "FIREBASE_CREDENTIALS_PATH",
            "GOOGLE_APPLICATION_CREDENTIALS",
        ),
        description="Optional path to Firebase Admin service account JSON credentials file.",
    )
    FIREBASE_SERVICE_ACCOUNT_KEY: Union[str, None] = Field(
        default=None,
        description="Optional raw JSON string of Firebase Admin service account credentials.",
    )

    @property
    def is_firebase_configured(self) -> bool:
        """Helper to verify if Firebase configuration is available."""
        return bool(self.FIREBASE_PROJECT_ID and self.FIREBASE_PROJECT_ID.strip())

    def validate_production_configuration(self) -> None:
        """Validate critical configuration variables when running in production."""
        if not self.is_production:
            return

        if not self.is_gemini_configured:
            raise RuntimeError(
                "Critical Configuration Error: GEMINI_API_KEY must be configured in production environment."
            )

        if not self.FIREBASE_PROJECT_ID or not self.FIREBASE_PROJECT_ID.strip():
            raise RuntimeError(
                "Critical Configuration Error: FIREBASE_PROJECT_ID must be configured in production environment."
            )

        origins = self.assemble_cors_origins(self.CORS_ORIGINS)
        if not origins or "*" in origins:
            raise RuntimeError(
                "Critical Security Error: Wildcard '*' or empty CORS origin is not permitted in production with credentials enabled. Specify explicit origins."
            )


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
