"""
Role-Based Access Control (RBAC) decorators.

Usage::

    from middleware.decorators import admin_required, manager_required, roles_required

    @admin_required
    def list_all_users(): ...

    @manager_required
    def moderate_forum_post(): ...

    @roles_required("admin", "manager")
    def review_medical_history(): ...

Each decorator stacks on top of ``@jwt_required()`` so that authentication
is always checked before authorization.
"""
from __future__ import annotations

from functools import wraps

from flask import g, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from utils.responses import error_response
from utils.logger import get_logger

logger = get_logger(__name__)

# Valid roles in priority order (higher index = higher privilege)
_ROLE_PRIORITY = ["user", "manager", "admin"]


def _user_role() -> str:
    """Return the authenticated user's role from the JWT claims."""
    claims = get_jwt()
    return claims.get("role", "user")


def _check_role(fn, required_roles: tuple[str, ...]):
    """Common wrapper that enforces ``@jwt_required`` + role check."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        user_role = claims.get("role", "user")
        user_id = claims.get("sub")

        # Populate g for downstream use
        g.user_id = user_id
        g.user_role = user_role
        g.user_email = claims.get("email", "")
        g.user_name = claims.get("name", "")

        if user_role not in required_roles:
            logger.warning(
                "Authorization denied",
                extra={
                    "user_id": user_id,
                    "user_role": user_role,
                    "required_roles": list(required_roles),
                    "path": request.path,
                    "method": request.method,
                },
            )
            return error_response(
                "You do not have permission to perform this action",
                status=403,
            )

        return fn(*args, **kwargs)
    return wrapper


def login_required(fn):
    """
    Decorator: requires a valid (non-revoked) access token.

    Alias for ``@jwt_required()`` with ``g`` population.
    """
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        g.user_id = claims.get("sub")
        g.user_role = claims.get("role", "user")
        g.user_email = claims.get("email", "")
        g.user_name = claims.get("name", "")
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    """Decorator: requires the ``admin`` role."""
    return _check_role(fn, ("admin",))


def manager_required(fn):
    """Decorator: requires ``manager`` or ``admin`` role."""
    return _check_role(fn, ("manager", "admin"))


def roles_required(*roles: str):
    """
    Decorator: requires one of the specified roles.

    >>> @roles_required("admin", "manager")
    >>> def handler(): ...
    """
    # Normalise: roles_required("admin") and roles_required(("admin",)) both work
    flat = []
    for r in roles:
        if isinstance(r, (list, tuple)):
            flat.extend(r)
        else:
            flat.append(r)
    return _check_role(fn, tuple(flat))
