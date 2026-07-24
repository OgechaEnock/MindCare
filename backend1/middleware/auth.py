"""
Equivalent to middleware/authMiddleware.js
"""
import re
from datetime import timedelta
from functools import wraps

import jwt
from flask import g, jsonify, request

from config import config

JWT_SECRET = config.JWT_SECRET

_UNIT_TO_KWARG = {
    "s": "seconds",
    "m": "minutes",
    "h": "hours",
    "d": "days",
    "w": "weeks",
}


def parse_expires_in(value) -> timedelta:
    """
    Parses strings like '7d', '24h', '3600s', '15m' (as used by
    jsonwebtoken's `expiresIn` option) into a timedelta. Falls back to
    treating a bare number as seconds.
    """
    if isinstance(value, (int, float)):
        return timedelta(seconds=value)

    match = re.fullmatch(r"(\d+)\s*([smhdw])?", str(value).strip())
    if not match:
        # Sensible default if the env var is malformed
        return timedelta(days=7)

    amount, unit = match.groups()
    kwarg = _UNIT_TO_KWARG.get(unit or "s", "seconds")
    return timedelta(**{kwarg: int(amount)})


def generate_token(payload: dict) -> str:
    exp = parse_expires_in(config.JWT_EXPIRES_IN)
    to_encode = {**payload}
    to_encode_exp = jwt.encode(
        {**to_encode, "exp": _now_plus(exp)},
        JWT_SECRET,
        algorithm="HS256",
    )
    return to_encode_exp


def _now_plus(delta: timedelta):
    from datetime import datetime, timezone
    return datetime.now(tz=timezone.utc) + delta


def authenticate_token(f):
    """Decorator that verifies the JWT and attaches the decoded user to g.user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        parts = auth_header.split(" ")
        token = parts[1] if len(parts) == 2 else None

        if not token:
            return jsonify({"error": "Access denied. No token provided."}), 401

        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please login again."}), 401
        except jwt.InvalidTokenError as err:
            print(f"Token verification error: {err}")
            return jsonify({"error": "Invalid token."}), 403

        g.user = decoded
        return f(*args, **kwargs)

    return decorated