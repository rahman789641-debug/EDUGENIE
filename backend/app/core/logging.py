"""Structured logging foundation for EDUGENIE backend."""

import logging
import sys
from typing import Optional


class StructuredFormatter(logging.Formatter):
    """Clean, consistent log formatter with timestamps and component context."""

    def format(self, record: logging.LogRecord) -> str:
        # Standardize timestamp ISO format
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        prefix = f"[{timestamp}] [{record.levelname:<8}] [{record.name}]"
        message = record.getMessage()

        if record.exc_info:
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)

        if record.exc_text:
            if message:
                message = f"{message}\n{record.exc_text}"
            else:
                message = record.exc_text

        return f"{prefix} {message}"


def setup_logging(log_level: Optional[str] = "INFO") -> None:
    """Initialize structured logging across the application."""
    numeric_level = getattr(logging, (log_level or "INFO").upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Clear existing handlers to prevent duplicate lines
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(StructuredFormatter())

    root_logger.addHandler(console_handler)

    # Set specific third-party logger levels to reduce noise
    logging.getLogger("uvicorn.access").setLevel(numeric_level)
    logging.getLogger("uvicorn.error").setLevel(numeric_level)
