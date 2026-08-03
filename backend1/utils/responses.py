"""
Standardized API response helpers.

Every endpoint returns one of two envelopes:

Success::

    {"success": true,  "message": "...", "data":  <payload>}

Error::

    {"success": false, "message": "...", "errors": <list[str] | dict>}
"""
from __future__ import annotations

from typing import Any

from flask import jsonify
from werkzeug.exceptions import HTTPException


def _envelope(success: bool, message: str, data_or_errors: Any = None, status: int = 200) -> tuple:
    if success:
        body = {"success": True, "message": message}
        if data_or_errors is not None:
            body["data"] = data_or_errors
    else:
        body = {"success": False, "message": message}
        if data_or_errors is not None:
            body["errors"] = data_or_errors
    return jsonify(body), status


def success_response(data: Any = None, message: str = "Success", status: int = 200) -> tuple:
    """Return a standardized success JSON response."""
    return _envelope(True, message, data, status)


def error_response(message: str = "An error occurred", errors: Any = None, status: int = 400) -> tuple:
    """Return a standardized error JSON response."""
    return _envelope(False, message, errors, status)


def handle_api_error(err: Exception | HTTPException, default_status: int = 500) -> tuple:
    """
    Convert an exception / HTTPException into a standardized error response
    **without** leaking internal details to the client.
    """
    if isinstance(err, HTTPException):
        return error_response(
            message=err.description or "Request error",
            status=err.code or default_status,
        )
    return error_response(message="Internal server error", status=default_status)
