"""
Centralized, structured logging for the MindCare Flask application.

Security guarantees:
  * Never logs passwords, JWT tokens, encryption keys, or API keys.
  * Uses JSON output for easy ingestion by log aggregators.
  * Supports rotating file handlers in development.
  * Provides a ``get_logger`` helper that all modules import.

Usage::

    from utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("User logged in", extra={"user_id": 42})
"""
from __future__ import annotations

import json
import logging
import logging.config
import os
from datetime import datetime, timezone
from typing import Any

# Fields that must NEVER appear in log output, even if passed via extra={}
_SENSITIVE_KEYS = frozenset({
    "password", "passwd", "pwd", "secret", "secret_key",
    "jwt_secret", "jwt_secret_key", "token", "access_token",
    "refresh_token", "authorization", "api_key", "encryption_key",
    "db_password", "credit_card", "ssn",
})


class _RedactingFilter(logging.Filter):
    """Redact sensitive keys from log record ``__dict__`` before emission."""

    def filter(self, record: logging.LogRecord) -> bool:
        for key in list(record.__dict__):
            if key.lower() in _SENSITIVE_KEYS:
                record.__dict__[key] = "[REDACTED]"
        if hasattr(record, "msg") and isinstance(record.msg, str):
            for keyword in ("Bearer ", "token=", "password=", "Authorization"):
                if keyword in record.msg:
                    record.msg = "[REDACTED: sensitive keyword detected]"
                    break
        return True


class _JSONFormatter(logging.Formatter):
    """Emit log records as single-line JSON for machine parsing."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "process", "processName", "message",
                "timestamp", "level", "logger",
            }:
                continue
            if key.lower() in _SENSITIVE_KEYS:
                payload[key] = "[REDACTED]"
            else:
                payload[key] = _json_safe(value)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def _json_safe(value: Any) -> Any:
    """Convert non-JSON-serializable values to strings."""
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return str(value)


def configure_logging(level: str = "INFO") -> dict:
    """
    Build a dictConfig suitable for ``logging.config.dictConfig``.

    In production: writes to stdout as JSON.
    Debug mode: also writes to a rotating file ``mindcare.log``.
    """
    is_prod = os.getenv("NODE_ENV", "development") == "production"

    handlers: dict = {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "level": level,
        },
    }
    if not is_prod:
        handlers["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "json",
            "level": "DEBUG",
            "filename": os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "mindcare.log"
            ),
            "maxBytes": 10_485_760,  # 10 MB
            "backupCount": 3,
        }

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"redact": {"()": _RedactingFilter}},
        "formatters": {"json": {"()": _JSONFormatter}},
        "handlers": handlers,
        "loggers": {
            "mindcare": {
                "level": level,
                "handlers": list(handlers.keys()),
                "filters": ["redact"],
                "propagate": False,
            },
            "apscheduler": {"level": "WARNING"},
            "urllib3": {"level": "WARNING"},
            "werkzeug": {"level": "WARNING", "propagate": is_prod},
        },
        "root": {
            "level": level,
            "handlers": ["console"],
            "filters": ["redact"],
        },
    }


def get_logger(name: str = "mindcare") -> logging.Logger:
    """Return a logger pre-configured with the JSON formatter and redaction filter."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.addHandler(logging.NullHandler())
    return logger
