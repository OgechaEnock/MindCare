"""
Moderation service — LLM API + keyword fallback, structured logging.
"""
from __future__ import annotations

import time

import requests

from config import config
from utils.logger import get_logger

logger = get_logger(__name__)

MODERATION_API_URL = config.MODERATION_API_URL
MODERATION_TIMEOUT_S = config.MODERATION_TIMEOUT_MS / 1000
MAX_RETRIES = 2
RETRY_DELAY_S = 1
_last_request_time = 0.0
MIN_REQUEST_INTERVAL_S = 2.0


def _wait_for_rate_limit():
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    if elapsed < MIN_REQUEST_INTERVAL_S:
        wait_time = MIN_REQUEST_INTERVAL_S - elapsed
        logger.info("Moderation rate-limit", extra={"wait_seconds": round(wait_time, 2)})
        time.sleep(wait_time)
    _last_request_time = time.time()


def _fallback_moderation(text):
    logger.info("Using fallback keyword-based moderation")
    lower_text = text.lower()
    banned_words = [
        "suicide", "kill yourself", "self-harm", "self harm", "kys",
        "spam", "viagra", "casino", "scam", "hate speech",
    ]
    found_words = [w for w in banned_words if w in lower_text]
    if found_words:
        return {"safety": False, "categories": found_words, "fallback": True}
    return {"safety": True, "categories": [], "fallback": True}


def moderate_text(text):
    """
    Moderate content using the external LLM moderation API, with retries
    and a keyword-based fallback if the service is unreachable.
    Returns: {"safety": bool, "categories": list, "fallback": bool}
    """
    if not text or not isinstance(text, str) or not text.strip():
        raise ValueError("Invalid text for moderation")

    logger.info("Moderating content", extra={"text_preview": text[:50]})

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            _wait_for_rate_limit()
            response = requests.post(
                MODERATION_API_URL,
                json={"prompt": text},
                timeout=MODERATION_TIMEOUT_S,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            safety = data.get("safety")
            categories = data.get("categories") or []
            logger.info("Moderation result", extra={
                "safety": safety, "attempt": attempt, "fallback": False
            })
            return {
                "safety": safety is True or safety == "safe" or safety == "Safe",
                "categories": categories,
                "fallback": False,
            }
        except requests.exceptions.Timeout:
            logger.warning("Moderation timed out", extra={"attempt": attempt})
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S * attempt)
                continue
            raise Exception("Moderation request timed out. Please try again.")
        except requests.exceptions.HTTPError as err:
            status = err.response.status_code if err.response is not None else None
            logger.warning("Moderation HTTP error", extra={"attempt": attempt, "status": status})
            if status == 429 and attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S * attempt)
                continue
            if status in (502, 503) and attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S * attempt)
                continue
            if attempt == MAX_RETRIES:
                logger.warning("All moderation attempts failed - using fallback")
                return _fallback_moderation(text)
            time.sleep(RETRY_DELAY_S * attempt)
        except (requests.exceptions.ConnectionError, requests.exceptions.RequestException) as err:
            logger.warning("Moderation connection error", extra={"attempt": attempt, "error": str(err)})
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S * attempt)
                continue
            logger.warning("All retry attempts failed - using fallback moderation")
            return _fallback_moderation(text)

    logger.warning("Moderation service unavailable - using fallback")
    return _fallback_moderation(text)