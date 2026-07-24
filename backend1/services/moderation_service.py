"""
Equivalent to services/moderationService.js
"""
import time

import requests

from config import config

MODERATION_API_URL = config.MODERATION_API_URL
MODERATION_TIMEOUT_S = config.MODERATION_TIMEOUT_MS / 1000
MAX_RETRIES = 2
RETRY_DELAY_S = 1  # seconds

# In-memory rate limiting (per-process, mirrors the Node version)
_last_request_time = 0.0
MIN_REQUEST_INTERVAL_S = 2.0


def _wait_for_rate_limit():
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    if elapsed < MIN_REQUEST_INTERVAL_S:
        wait_time = MIN_REQUEST_INTERVAL_S - elapsed
        print(f"Rate limit: Waiting {wait_time:.2f}s before next request...")
        time.sleep(wait_time)
    _last_request_time = time.time()


def _fallback_moderation(text: str) -> dict:
    print("Using fallback keyword-based moderation")
    lower_text = text.lower()
    banned_words = [
        "suicide", "kill yourself", "self-harm", "self harm", "kys",
        "spam", "viagra", "casino", "scam", "hate speech",
    ]
    found_words = [w for w in banned_words if w in lower_text]

    if found_words:
        return {"safety": False, "categories": found_words, "fallback": True}
    return {"safety": True, "categories": [], "fallback": True}


def moderate_text(text: str) -> dict:
    """
    Moderate content using the external LLM moderation API, with retries
    and a keyword-based fallback if the service is unreachable.
    Returns: {"safety": bool, "categories": list, "fallback": bool}
    """
    if not text or not isinstance(text, str) or not text.strip():
        raise ValueError("Invalid text for moderation")

    print(f"Moderating content: {text[:50]}...")

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

            print(f"Moderation result: safety={safety}, categories={categories}")

            return {
                "safety": safety is True or safety == "safe" or safety == "Safe",
                "categories": categories,
                "fallback": False,
            }

        except requests.exceptions.Timeout:
            print(f"Moderation attempt {attempt}/{MAX_RETRIES} timed out")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S * attempt)
                continue
            raise Exception("Moderation request timed out. Please try again.")

        except requests.exceptions.HTTPError as err:
            status = err.response.status_code if err.response is not None else None
            print(f"Moderation attempt {attempt}/{MAX_RETRIES} failed: HTTP {status}")

            if status == 429:
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_S * attempt)
                    continue
                raise Exception("Rate limit exceeded. Please wait a moment and try again.")

            if status in (502, 503):
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_S * attempt)
                    continue
                raise Exception("Moderation service is temporarily unavailable. Please try again later.")

            if attempt == MAX_RETRIES:
                print("All moderation attempts failed - using fallback")
                return _fallback_moderation(text)
            time.sleep(RETRY_DELAY_S * attempt)

        except (requests.exceptions.ConnectionError, requests.exceptions.RequestException) as err:
            print(f"Moderation attempt {attempt}/{MAX_RETRIES} failed: {err}")

            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S * attempt)
                continue

            print("All retry attempts failed - using fallback moderation")
            return _fallback_moderation(text)

    print("Moderation service completely unavailable - using fallback")
    return _fallback_moderation(text)