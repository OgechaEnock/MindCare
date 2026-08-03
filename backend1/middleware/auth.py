"""
Authentication middleware built on Flask-JWT-Extended.

Replaces the previous hand-rolled PyJWT / authenticate_token approach
with a production-grade JWT implementation providing:
  * Short-lived access tokens (15 min)
  * Long-lived refresh tokens (7 days)
  * Token revocation via DB blocklist (logout works)
  * Role-based claims in every token
"""
from __future__ import annotations

import datetime as _dt

import bcrypt
from flask import g
from flask_jwt_extended import (
    create_access_token, create_refresh_token, decode_token,
    get_jwt, get_jwt_identity, jwt_required,
)

from config import config
from db import query, revoke_token as _revoke_token
from extensions import jwt
from utils.responses import error_response

logger = __import__("utils.logger", fromlist=["get_logger"]).get_logger(__name__)


def init_jwt(app):
    """Register Flask-JWT-Extended callbacks on the Flask app."""
    jwt.init_app(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_jwt_header, jwt_payload):
        jti = jwt_payload.get("jti", "")
        if not jti:
            return True  # fail-safe
        try:
            result = query(
                "SELECT 1 FROM token_blocklist WHERE jti = %s AND expires_at > NOW() LIMIT 1",
                (jti,),
            )
            return len(result) > 0
        except Exception as exc:
            # Table missing (pre-migration DB) or DB hiccup — fail OPEN so
            # existing sessions are not logged out by revocation check errors.
            logger.warning(
                "Token blocklist check failed — failing open",
                extra={"error_type": type(exc).__name__, "jti": jti[:8]},
            )
            return False

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response(
            "The token has expired. Please use the refresh endpoint.",
            status=401,
        )

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return error_response("The token is invalid. Please log in again.", status=401)

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return error_response("A valid access token is required.", status=401)

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return error_response("The token has been revoked. Please log in again.", status=401)


# ─── Password helpers ────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash *password* with bcrypt using the configured work factor."""
    rounds = getattr(config, "BCRYPT_ROUNDS", 12)
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds)
    ).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Return True if *password* matches the bcrypt *hashed* value."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ─── Token creation ──────────────────────────────────────────────────────


def create_tokens(user_row: dict) -> dict:
    """
    Create access + refresh JWT tokens for a user database row.

    Claims: sub (user id), id, email, name, role — keeping the frontend's
    jwt_decode expectations intact.
    """
    user_id = user_row["id"]
    additional_claims = {
        "id": user_id,
        "email": user_row.get("email", ""),
        "name": user_row.get("name", ""),
        "role": user_row.get("role", "user"),
    }
    # Flask-JWT-Extended 4.x requires the subject (identity) to be a STRING.
    # Passing an int causes InvalidSubjectError on verification → 401 on
    # every authenticated request. Convert to str; DB queries cast it back.
    access = create_access_token(identity=str(user_id), additional_claims=additional_claims)
    refresh = create_refresh_token(identity=str(user_id), additional_claims=additional_claims)
    return {"access": access, "refresh": refresh}


def revoke_current_token():
    """Add the *current* access token's JTI to the DB blocklist."""
    claims = get_jwt()
    jti = claims["jti"]
    exp = claims.get("exp")
    token_type = claims.get("type", "access")
    expires_at = _dt.datetime.fromtimestamp(exp, tz=_dt.timezone.utc) if exp else None
    _revoke_token(jti, token_type, expires_at)


def revoke_refresh_token(refresh_token_str: str):
    """Decode and revoke a refresh-token string."""
    try:
        decoded = decode_token(refresh_token_str)
        jti = decoded["jti"]
        exp = decoded.get("exp")
        expires_at = _dt.datetime.fromtimestamp(exp, tz=_dt.timezone.utc) if exp else None
        _revoke_token(jti, "refresh", expires_at)
    except Exception:
        pass
