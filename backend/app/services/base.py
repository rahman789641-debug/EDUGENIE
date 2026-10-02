"""Base service class providing shared logging and lifecycle management."""

import logging
from typing import Optional


class BaseService:
    """Base class for all business logic and integration services."""

    def __init__(self, service_name: Optional[str] = None) -> None:
        self.logger = logging.getLogger(f"edugenie.services.{service_name or self.__class__.__name__}")
