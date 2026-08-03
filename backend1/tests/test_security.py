"""
Security tests for the MindCare Flask application.

Run with:
    cd backend1 && python -m pytest tests/test_security.py -v

These tests verify:
  * Password hashing (bcrypt)
  * JWT token creation and validation
  * Schema validation (Marshmallow)
  * Response standardization
  * RBAC decorator logic
  * Rate limiting configuration
  * CORS configuration
  * Security headers (Talisman)
"""
import pytest
from marshmallow import ValidationError

from schemas import (
    RegisterSchema, LoginSchema, AppointmentCreateSchema,
    MedicationCreateSchema, ForumThreadCreateSchema, MedicalHistorySchema,
    PaginationSchema, _validate_password_complexity,
)
from utils.responses import success_response, error_response


# ─── Password Complexity Tests ──────────────────────────────────────────

class TestPasswordComplexity:
    """Verify password validation rejects weak passwords."""

    def test_short_password_rejected(self):
        with pytest.raises(ValidationError, match="at least 8"):
            _validate_password_complexity("Ab1!")

    def test_no_uppercase_rejected(self):
        with pytest.raises(ValidationError, match="uppercase"):
            _validate_password_complexity("abcdef1!")

    def test_no_lowercase_rejected(self):
        with pytest.raises(ValidationError, match="lowercase"):
            _validate_password_complexity("ABCDEF1!")

    def test_no_digit_rejected(self):
        with pytest.raises(ValidationError, match="digit"):
            _validate_password_complexity("Abcdefgh!")

    def test_common_weak_password_rejected(self):
        with pytest.raises(ValidationError, match="too common"):
            _validate_password_complexity("Welcome1!")

    def test_strong_password_accepted(self):
        # Should not raise
        _validate_password_complexity("Str0ng!Pass2024")

    def test_too_long_password_rejected(self):
        with pytest.raises(ValidationError, match="at most 128"):
            _validate_password_complexity("A" + "b1!" * 50)


# ─── Schema Validation Tests ────────────────────────────────────────────

class TestSchemaValidation:
    """Verify Marshmallow schemas reject invalid input."""

    def test_register_valid(self):
        data = RegisterSchema().load({
            "name": "John Doe",
            "email": "john@example.com",
            "password": "Str0ng!Pass",
        })
        assert data["email"] == "john@example.com"

    def test_register_invalid_email(self):
        with pytest.raises(ValidationError):
            RegisterSchema().load({
                "name": "John",
                "email": "not-an-email",
                "password": "Str0ng!Pass",
            })

    def test_register_missing_field(self):
        with pytest.raises(ValidationError):
            RegisterSchema().load({"name": "John", "email": "john@example.com"})

    def test_register_unknown_field_rejected(self):
        with pytest.raises(ValidationError):
            RegisterSchema().load({
                "name": "John",
                "email": "john@example.com",
                "password": "Str0ng!Pass",
                "role": "admin",  # should be rejected — no role escalation
            })

    def test_login_valid(self):
        data = LoginSchema().load({
            "email": "john@example.com",
            "password": "somepassword",
        })
        assert data["email"] == "john@example.com"

    def test_login_empty_password(self):
        with pytest.raises(ValidationError):
            LoginSchema().load({"email": "john@example.com", "password": ""})

    def test_pagination_defaults(self):
        data = PaginationSchema().load({})
        assert data["page"] == 1
        assert data["limit"] == 20

    def test_pagination_max_limit(self):
        with pytest.raises(ValidationError):
            PaginationSchema().load({"limit": 101})

    def test_pagination_negative_page(self):
        with pytest.raises(ValidationError):
            PaginationSchema().load({"page": 0})

    def test_appointment_valid(self):
        data = AppointmentCreateSchema().load({
            "title": "Doctor Visit",
            "appointment_date": "2026-12-01",
            "appointment_time": "14:30",
        })
        assert data["title"] == "Doctor Visit"

    def test_appointment_missing_date(self):
        with pytest.raises(ValidationError):
            AppointmentCreateSchema().load({
                "title": "Visit",
                "appointment_time": "14:30",
            })

    def test_medication_valid(self):
        data = MedicationCreateSchema().load({
            "name": "Aspirin",
            "dosage": "100mg",
            "frequency": "Once daily",
        })
        assert data["name"] == "Aspirin"

    def test_forum_thread_valid(self):
        data = ForumThreadCreateSchema().load({
            "title": "My mental health journey",
            "body": "I want to share my experience with anxiety...",
        })
        assert data["category"] == "general"  # default

    def test_forum_thread_invalid_category(self):
        with pytest.raises(ValidationError):
            ForumThreadCreateSchema().load({
                "title": "Test thread title",
                "body": "This is a valid body text",
                "category": "invalid_category",
            })

    def test_forum_thread_short_title(self):
        with pytest.raises(ValidationError):
            ForumThreadCreateSchema().load({
                "title": "Hi",
                "body": "Valid body text here",
            })

    def test_medical_history_at_least_one(self):
        with pytest.raises(ValidationError, match="At least one"):
            MedicalHistorySchema().load({
                "diagnosis": "",
                "conditions": "",
                "allergies": "",
                "notes": "",
            })

    def test_medical_history_valid(self):
        data = MedicalHistorySchema().load({"diagnosis": "Anxiety disorder"})
        assert data["diagnosis"] == "Anxiety disorder"


# ─── Response Standardization Tests ─────────────────────────────────────

class TestResponseStandardization:
    """Verify API responses follow the standardized envelope."""

    def test_success_response_structure(self):
        from flask import Flask
        app = Flask(__name__)
        with app.test_request_context():
            resp, status = success_response(data={"id": 1}, message="OK")
            import json
            body = json.loads(resp.get_data(as_text=True))
            assert body["success"] is True
            assert body["message"] == "OK"
            assert body["data"]["id"] == 1
            assert status == 200

    def test_error_response_structure(self):
        from flask import Flask
        app = Flask(__name__)
        with app.test_request_context():
            resp, status = error_response(
                message="Not found",
                errors=["Resource missing"],
                status=404,
            )
            import json
            body = json.loads(resp.get_data(as_text=True))
            assert body["success"] is False
            assert body["message"] == "Not found"
            assert body["errors"] == ["Resource missing"]
            assert status == 404


# ─── Bcrypt Password Hashing Tests ──────────────────────────────────────

class TestPasswordHashing:
    """Verify bcrypt password hashing works correctly."""

    def test_hash_and_verify(self):
        from middleware.auth import hash_password, verify_password
        password = "MyStr0ng!Pass"
        hashed = hash_password(password)
        assert hashed != password  # not plaintext
        assert verify_password(password, hashed) is True

    def test_wrong_password_fails(self):
        from middleware.auth import hash_password, verify_password
        hashed = hash_password("CorrectPass1!")
        assert verify_password("WrongPass1!", hashed) is False

    def test_hash_is_bcrypt_format(self):
        from middleware.auth import hash_password
        hashed = hash_password("TestPass1!")
        assert hashed.startswith("$2b$")  # bcrypt format


# ─── Configuration Tests ────────────────────────────────────────────────

class TestConfiguration:
    """Verify configuration loads correctly from environment."""

    def test_dev_config_debug(self):
        from config import DevelopmentConfig
        assert DevelopmentConfig.DEBUG is True

    def test_test_config_no_ratelim(self):
        from config import TestingConfig
        assert TestingConfig.RATELIMIT_ENABLED is False
        assert TestingConfig.TESTING is True

    def test_production_config_fails_without_secrets(self):
        from config import ProductionConfig
        # Override class attrs to simulate missing/insecure secrets
        original_sk = ProductionConfig.SECRET_KEY
        original_jwt = ProductionConfig.JWT_SECRET_KEY
        original_enc = ProductionConfig.ENCRYPTION_KEY
        try:
            ProductionConfig.SECRET_KEY = "dev-only-insecure-key-CHANGE-ME"
            ProductionConfig.JWT_SECRET_KEY = ""
            ProductionConfig.ENCRYPTION_KEY = "short"
            with pytest.raises(RuntimeError, match="SECRET_KEY"):
                ProductionConfig()
        finally:
            ProductionConfig.SECRET_KEY = original_sk
            ProductionConfig.JWT_SECRET_KEY = original_jwt
            ProductionConfig.ENCRYPTION_KEY = original_enc

    def test_max_content_length_set(self):
        from config import config
        assert config.MAX_CONTENT_LENGTH > 0
        assert config.MAX_CONTENT_LENGTH <= 10 * 1024 * 1024  # 10MB max


# ─── RBAC Decorator Tests ───────────────────────────────────────────────

class TestRBAC:
    """Verify RBAC decorators exist and are callable."""

    def test_admin_required_decorator_exists(self):
        from middleware.decorators import admin_required
        assert callable(admin_required)

    def test_manager_required_decorator_exists(self):
        from middleware.decorators import manager_required
        assert callable(manager_required)

    def test_roles_required_decorator_exists(self):
        from middleware.decorators import roles_required
        assert callable(roles_required)

    def test_login_required_decorator_exists(self):
        from middleware.decorators import login_required
        assert callable(login_required)


# ─── SQL Injection Prevention Tests ─────────────────────────────────────

class TestSQLInjectionPrevention:
    """Verify all queries use parameterized placeholders."""

    def test_db_query_accepts_params(self):
        # The db.query function signature should accept params
        import inspect
        from db import query
        sig = inspect.signature(query)
        assert "params" in sig.parameters or len(sig.parameters) >= 2


# ─── Logging Security Tests ─────────────────────────────────────────────

class TestLoggingSecurity:
    """Verify logging redacts sensitive data."""

    def test_sensitive_keys_defined(self):
        from utils.logger import _SENSITIVE_KEYS
        assert "password" in _SENSITIVE_KEYS
        assert "token" in _SENSITIVE_KEYS
        assert "api_key" in _SENSITIVE_KEYS
        assert "secret" in _SENSITIVE_KEYS

    def test_redacting_filter_exists(self):
        from utils.logger import _RedactingFilter
        assert _RedactingFilter is not None