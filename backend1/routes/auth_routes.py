"""
Authentication routes — JWT access + refresh tokens, refresh, logout.

Endpoints:
  POST /api/auth/register       – 10/hour/IP
  POST /api/auth/login          – 5/minute/IP
  POST /api/auth/refresh        – 100/minute/user
  POST /api/auth/logout         – 300/minute/user
  GET  /api/auth/me             – 300/minute/user
"""
from __future__ import annotations

from flask import request
from flask_jwt_extended import (
    create_access_token, get_jwt, get_jwt_identity, jwt_required,
)

from config import config
from db import query
from extensions import limiter
from middleware.auth import (
    create_tokens, hash_password, revoke_current_token, revoke_refresh_token,
    verify_password,
)
from schemas import LoginSchema, RegisterSchema, validate_request, _validate_password_complexity
from utils.responses import error_response, success_response
from utils.logger import get_logger

import bcrypt as _bcrypt

auth_bp = __import__("flask").Blueprint("auth", __name__, url_prefix="/api/auth")
logger = get_logger(__name__)


@auth_bp.post("/register")
@limiter.limit("10 per hour")
@validate_request(RegisterSchema)
def register():
    data = request.validated

    # Check for existing email
    existing = query("SELECT id FROM users WHERE email = %s LIMIT 1", (data["email"],))
    if existing:
        logger.warning(
            "Registration attempt with existing email",
            extra={"email": data["email"]},
        )
        return error_response("Email already registered", status=409)

    # Server-side password validation with detailed errors
    try:
        _validate_password_complexity(data["password"])
    except Exception as e:
        return error_response(str(e), status=400)

    hashed_pw = hash_password(data["password"])
    # role defaults to 'user' — never trust client-supplied role
    rows = query(
        "INSERT INTO users (name, email, password, role) "
        "VALUES (%s, %s, %s, 'user') RETURNING id, name, email, role, created_at",
        (data["name"], data["email"], hashed_pw),
    )
    user_row = rows[0]
    tokens = create_tokens(user_row)

    logger.info("User registered", extra={
        "user_id": user_row["id"],
        "email": data["email"],
    })

    return success_response(
        data={
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": {
                "id": user_row["id"],
                "name": user_row["name"],
                "email": user_row["email"],
                "role": user_row["role"],
            },
        },
        message="Registration successful",
        status=201,
    )


@auth_bp.post("/login")
@limiter.limit("5 per minute")
@validate_request(LoginSchema)
def login():
    data = request.validated
    user_row = query(
        "SELECT id, name, email, password, role FROM users WHERE email = %s LIMIT 1",
        (data["email"],),
    )
    if not user_row or not verify_password(data["password"], user_row[0]["password"]):
        logger.warning(
            "Failed login attempt",
            extra={"email": data["email"], "ip": request.remote_addr},
        )
        return error_response("Invalid email or password", status=401)

    user = user_row[0]
    tokens = create_tokens(user)

    logger.info("User logged in", extra={
        "user_id": user["id"], "email": user["email"],
    })

    return success_response(
        data={
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
            },
        },
        message="Login successful",
    )


@auth_bp.post("/refresh")
@limiter.limit("100 per minute")
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a valid refresh token."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    additional_claims = {
        "id": user_id,
        "email": claims.get("email", ""),
        "name": claims.get("name", ""),
        "role": claims.get("role", "user"),
    }
    # Flask-JWT-Extended 4.x requires subject to be a string
    new_access = create_access_token(identity=str(user_id), additional_claims=additional_claims)
    return success_response(
        data={"access": new_access},
        message="Token refreshed",
    )


@auth_bp.post("/logout")
@limiter.limit("300 per minute")
@jwt_required()
def logout():
    """Revoke the current access token and optionally the refresh token."""
    revoke_current_token()

    # Also revoke the refresh token if the client sends it in the body
    body = request.get_json(silent=True) or {}
    refresh_token = body.get("refresh")
    if refresh_token:
        revoke_refresh_token(refresh_token)

    return success_response(message="Logout successful")


@auth_bp.get("/me")
@limiter.limit("300 per minute")
@jwt_required()
def me():
    """Return the authenticated user's profile (excluding password hash)."""
    claims = get_jwt()
    user_id = claims.get("sub")
    rows = query(
        "SELECT id, name, email, role, created_at FROM users WHERE id = %s LIMIT 1",
        (user_id,),
    )
    if not rows:
        return error_response("User not found", status=404)
    user = rows[0]
    # Convert date/datetime to ISO strings for JSON
    created = user.get("created_at")
    if hasattr(created, "isoformat"):
        created = created.isoformat()
    return success_response(
        data={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "created_at": created,
        },
        message="User profile retrieved",
    )
