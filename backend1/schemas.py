"""
Marshmallow schemas for request validation.

Every endpoint that accepts user input must validate against one of these
schemas before touching the database.  This enforces:

  * Correct types (no implicit coercion)
  * Length / range limits
  * Email format validation
  * Password complexity (uppercase, lowercase, digit, min length)
  * Enum validation (forum categories)
  * Rejection of unexpected / extra fields (unknown=EXCLUDE is NOT used —
    unknown fields raise a 400 error)

Usage::

    from schemas import RegisterSchema
    data = RegisterSchema().load(request.get_json(force=True, silent=True) or {})
"""
from __future__ import annotations

import re
from datetime import datetime, date, time as dt_time

from marshmallow import (
    Schema, fields, validate, validates_schema, ValidationError, EXCLUDE,
)

# ─── Constants ──────────────────────────────────────────────────────────

FORUM_CATEGORIES = {"general", "support", "resources", "success", "questions"}

# Reject these and other commonly-known weak passwords
_COMMON_WEAK_PASSWORDS = frozenset({
    "password", "password123", "12345678", "qwerty123", "abc12345",
    "iloveyou", "monkey123", "letmein1", "admin123", "welcome1",
    "password1", "11111111", "00000000", "superman1",
    "welcome1!", "admin123!", "letmein1!", "monkey123!",
})

_PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)"
    r"(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~ ]).{8,128}$"
)


# ─── Helpers ────────────────────────────────────────────────────────────

def _validate_password_complexity(password: str) -> None:
    """Raise ValidationError if *password* fails complexity rules."""
    if not password:
        return  # required=True already catches this
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters")
    if len(password) > 128:
        raise ValidationError("Password must be at most 128 characters")
    if not any(c.isupper() for c in password):
        raise ValidationError("Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise ValidationError("Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise ValidationError("Password must contain at least one digit")
    if password.lower() in _COMMON_WEAK_PASSWORDS:
        raise ValidationError("Password is too common — choose a stronger password")


# ─── Auth Schemas ───────────────────────────────────────────────────────

class RegisterSchema(Schema):
    """Validate POST /api/auth/register"""
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(required=True)

    @validates_schema
    def _check_password(self, data, **kwargs):
        _validate_password_complexity(data.get("password"))


class LoginSchema(Schema):
    """Validate POST /api/auth/login"""
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(required=True, validate=validate.Length(min=1, max=128))


class PaginationSchema(Schema):
    """Validate ?page=&limit= query parameters on list endpoints."""
    page = fields.Int(required=False, load_default=1, validate=validate.Range(min=1))
    limit = fields.Int(required=False, load_default=20, validate=validate.Range(min=1, max=100))


# ─── Appointment Schemas ────────────────────────────────────────────────

class AppointmentCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    appointment_date = fields.Date(required=True)
    appointment_time = fields.Time(required=True)
    notes = fields.Str(required=False, allow_none=True, validate=validate.Length(max=2000))
    # data_key aliases match the field names the React frontend sends
    reminder_24h = fields.Bool(load_default=True, data_key="reminder24h")
    reminder_1h = fields.Bool(load_default=True, data_key="reminder1h")


# ─── Medication Schemas ─────────────────────────────────────────────────

class MedicationCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    dosage = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    frequency = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    # data_key aliases match the field names the React frontend sends
    reminder_enabled = fields.Bool(load_default=False, data_key="reminderEnabled")
    reminder_times = fields.List(
        fields.Str(validate=validate.Length(equal=5)), load_default=[], data_key="reminderTimes"
    )


class MedicationReminderSchema(Schema):
    # data_key aliases match the field names the React frontend sends
    reminder_enabled = fields.Bool(required=False, data_key="reminderEnabled")
    reminder_times = fields.List(
        fields.Str(validate=validate.Length(equal=5)), required=False, data_key="reminderTimes"
    )


# ─── Forum Schemas ──────────────────────────────────────────────────────

class ForumThreadCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=5, max=200))
    body = fields.Str(required=True, validate=validate.Length(min=10, max=5000))
    category = fields.Str(
        required=False, load_default="general",
        validate=validate.OneOf(sorted(FORUM_CATEGORIES)),
    )


# ─── Medical History Schemas ────────────────────────────────────────────

class MedicalHistorySchema(Schema):
    diagnosis = fields.Str(required=False, allow_none=True, validate=validate.Length(max=2000))
    conditions = fields.Str(required=False, allow_none=True, validate=validate.Length(max=2000))
    allergies = fields.Str(required=False, allow_none=True, validate=validate.Length(max=2000))
    notes = fields.Str(required=False, allow_none=True, validate=validate.Length(max=5000))

    @validates_schema
    def _at_least_one(self, data, **kwargs):
        if not any(data.get(k) for k in ("diagnosis", "conditions", "allergies", "notes")):
            raise ValidationError("At least one field is required")


class EmergencyContactSchema(Schema):
    """Validated fields accepted by the emergency-contact endpoint."""

    emergency_contact_name = fields.Str(required=True, validate=validate.Length(min=2, max=255))
    emergency_contact_relationship = fields.Str(required=True, validate=validate.Length(max=100))
    emergency_contact_phone = fields.Str(required=True, validate=validate.Length(max=20))
    emergency_contact_alt_phone = fields.Str(required=False, allow_none=True, validate=validate.Length(max=20))
    emergency_contact_email = fields.Email(required=False, allow_none=True, validate=validate.Length(max=255))


class ProfileUpdateSchema(Schema):
    """Validated fields accepted by the profile-update endpoint."""

    name = fields.Str(required=False, validate=validate.Length(min=2, max=100))
    phone = fields.Str(required=False, allow_none=True, validate=validate.Length(max=20))
    date_of_birth = fields.Date(required=False, allow_none=True)
    gender = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.OneOf(["male", "female", "other", "prefer-not-to-say"]),
    )
    address = fields.Str(required=False, allow_none=True)
    bio = fields.Str(required=False, allow_none=True, validate=validate.Length(max=500))


# ─── Validation helper ──────────────────────────────────────────────────

def validate_request(schema_cls: type[Schema], data: dict | None = None):
    """
    Decorator that validates the JSON body (or query string) against a
    Marshmallow schema.  On failure, returns a standardized 400 response.

    If *data* is ``None``, the decorator reads ``request.get_json`` at call time.
    """
    from functools import wraps
    from flask import request, current_app
    from utils.responses import error_response

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Parse JSON body once; reject if missing or invalid
            raw = request.get_json(silent=True)
            if raw is None:
                raw = {}
            try:
                # unknown=EXCLUDE would silently drop extra fields.
                # Instead we use the default behaviour which rejects unknowns.
                validated = schema_cls().load(raw)
            except ValidationError as exc:
                logger = current_app.logger
                logger.warning(
                    "Validation failed",
                    extra={"path": request.path, "errors": exc.messages},
                )
                return error_response(
                    "Validation failed",
                    errors=exc.messages,
                    status=400,
                )
            request.validated = validated  # type: ignore[attr-defined]
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def validate_query(schema_cls: type[Schema]):
    """Decorator that validates query parameters against a Marshmallow schema."""
    from functools import wraps
    from flask import request, current_app
    from utils.responses import error_response

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                validated = schema_cls().load(request.args.to_dict())
            except ValidationError as exc:
                return error_response(
                    "Invalid query parameters",
                    errors=exc.messages,
                    status=400,
                )
            request.validated_query = validated  # type: ignore[attr-defined]
            return fn(*args, **kwargs)
        return wrapper
    return decorator
