"""
Moderation API Server - Standalone FastAPI server that proxies moderation
requests to Ollama for AI-powered content moderation.

This server listens on http://127.0.0.1:8000 and provides:
  POST /generate/ - Accepts {"prompt": "text"} and returns {"safety": bool, "categories": [...]}

The existing moderation_service.py in backend1 already calls this endpoint.
"""

import json
import time
import logging
import threading
from typing import Dict, Any

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ── Configuration ──────────────────────────────────────────────────────────

OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"
OLLAMA_TIMEOUT_S = 60  # Increased to handle model loading time on first request

HOST = "127.0.0.1"
PORT = 8000

# Rate limiting
_last_request_time = 0.0
MIN_REQUEST_INTERVAL_S = 1.0

# Model warm-up
_model_loaded = False
_warmup_lock = threading.Lock()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("moderation-api")

# ── FastAPI App ────────────────────────────────────────────────────────────

app = FastAPI(title="MindCare Moderation API", version="1.0.0")


class ModerationRequest(BaseModel):
    prompt: str


class ModerationResponse(BaseModel):
    safety: bool
    categories: list = []
    fallback: bool = False


# ── Moderation Prompt ──────────────────────────────────────────────────────

MODERATION_SYSTEM_PROMPT = """You are a content moderation assistant for a mental health support community forum. Your task is to analyze the given text and determine if it is safe for publication.

Rules for flagging content as UNSAFE (safety=false):
1. Suicide or self-harm content (e.g., "kill myself", "want to die", "self-harm methods")
2. Harassment, bullying, or hate speech
3. Explicit violent threats
4. Spam, scams, or promotional content (e.g., "buy now", "casino", "viagra")
5. Sexually explicit or inappropriate content
6. Personal medical advice that could be dangerous (e.g., specific medication dosages)

Content that is SAFE (safety=true):
- General mental health discussions
- Personal experiences and stories
- Supportive messages and encouragement
- Questions about mental health resources
- Success stories and recovery journeys
- General discussions about therapy, medication experiences (without giving specific medical advice)

Respond with ONLY a JSON object (no other text):
{"safety": true/false, "categories": ["list", "of", "violated", "categories"]}

Categories should describe what rule was violated (e.g., "self-harm", "hate speech", "spam", "harassment", "explicit", "medical-advice"). If safe, return empty categories list.

Text to analyze: """


def _warmup_model():
    """Pre-load the model into Ollama memory by sending a warmup request."""
    global _model_loaded
    with _warmup_lock:
        if _model_loaded:
            return
        try:
            logger.info(f"Warming up model {OLLAMA_MODEL}...")
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": "warmup",
                "stream": False,
                "options": {"temperature": 0.1},
            }
            response = requests.post(
                OLLAMA_API_URL,
                json=payload,
                timeout=120,  # Long timeout for initial model load
            )
            response.raise_for_status()
            _model_loaded = True
            logger.info("Model warm-up complete")
        except Exception as e:
            logger.warning(f"Model warm-up failed (will retry on first request): {e}")
            _model_loaded = False


def _wait_for_rate_limit():
    """Simple rate limiter to avoid overwhelming Ollama."""
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    if elapsed < MIN_REQUEST_INTERVAL_S:
        wait_time = MIN_REQUEST_INTERVAL_S - elapsed
        time.sleep(wait_time)
    _last_request_time = time.time()


def _call_ollama(prompt: str) -> Dict[str, Any]:
    """Send a prompt to Ollama and return the parsed response."""
    full_prompt = MODERATION_SYSTEM_PROMPT + prompt

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "top_p": 0.9,
        },
    }

    logger.info(f"Sending to Ollama: {prompt[:60]}...")

    response = requests.post(
        OLLAMA_API_URL,
        json=payload,
        timeout=OLLAMA_TIMEOUT_S,
    )
    response.raise_for_status()

    return response.json()


def _parse_moderation_result(ollama_response: Dict[str, Any]) -> ModerationResponse:
    """Extract safety and categories from the Ollama response."""
    raw_text = ollama_response.get("response", "").strip()

    # Try to parse JSON from the response
    # The model might wrap it in markdown code blocks or add extra text
    json_str = raw_text

    # Remove markdown code block markers if present
    if "```json" in json_str:
        json_str = json_str.split("```json")[1].split("```")[0].strip()
    elif "```" in json_str:
        json_str = json_str.split("```")[1].split("```")[0].strip()

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError:
        # Fallback: try to find JSON-like content
        logger.warning(f"Failed to parse JSON from response, raw: {raw_text[:200]}")
        # Simple keyword-based extraction as last resort
        lower = raw_text.lower()
        if "true" in lower and ("safety" in lower or "safe" in lower):
            safety = "false" not in lower.split("safety")[0].split("true")[0] if "false" in lower else True
        else:
            safety = not any(word in lower for word in [
                "unsafe", "harmful", "flagged", "rejected", "not safe"
            ])
        return ModerationResponse(
            safety=safety,
            categories=["unable-to-parse"] if not safety else [],
            fallback=True,
        )

    safety = result.get("safety", True)
    categories = result.get("categories", [])

    # Normalize safety to boolean
    if isinstance(safety, str):
        safety = safety.lower() in ("true", "safe", "yes", "1")

    return ModerationResponse(
        safety=bool(safety),
        categories=categories if isinstance(categories, list) else [],
        fallback=False,
    )


# ── API Endpoints ──────────────────────────────────────────────────────────

@app.get("/")
@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "moderation-api",
        "model": OLLAMA_MODEL,
        "model_loaded": _model_loaded,
    }


@app.post("/generate/", response_model=ModerationResponse)
def moderate(request: ModerationRequest):
    """
    Moderate content using Ollama LLM.
    
    Accepts: {"prompt": "text to moderate"}
    Returns: {"safety": bool, "categories": [...]}
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="No prompt provided")

    text = request.prompt.strip()

    if len(text) < 3:
        raise HTTPException(status_code=400, detail="Text too short for moderation")

    if len(text) > 10000:
        text = text[:10000]
        logger.warning("Truncated text to 10000 characters")

    _wait_for_rate_limit()

    try:
        ollama_response = _call_ollama(text)
        result = _parse_moderation_result(ollama_response)

        logger.info(
            f"Moderation result: safety={result.safety}, "
            f"categories={result.categories}"
        )

        return result

    except requests.exceptions.Timeout:
        logger.error("Ollama request timed out")
        return ModerationResponse(
            safety=True,
            categories=["timeout"],
            fallback=True,
        )

    except requests.exceptions.ConnectionError as e:
        logger.error(f"Ollama connection error: {e}")
        return ModerationResponse(
            safety=True,
            categories=["service-unavailable"],
            fallback=True,
        )

    except Exception as e:
        logger.error(f"Moderation error: {e}")
        return ModerationResponse(
            safety=True,
            categories=["error"],
            fallback=True,
        )


# ── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info(f"Starting Moderation API on {HOST}:{PORT}")
    logger.info(f"Using Ollama model: {OLLAMA_MODEL}")
    logger.info(f"Ollama endpoint: {OLLAMA_API_URL}")
    
    # Warm up the model in a background thread during startup
    warmup_thread = threading.Thread(target=_warmup_model, daemon=True)
    warmup_thread.start()
    
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")