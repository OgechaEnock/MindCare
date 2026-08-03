"""
Centralized configuration loaded from environment variables (.env).

Provides three configuration classes selected by ``NODE_ENV`` / ``FLASK_ENV``:

  DevelopmentConfig  – debug=True, permissive CORS, console+file logging
  TestingConfig      – in-memory SQLite, test keys, rate-limiting disabled
  ProductionConfig   – debug=False, strict CORS, secure cookies, Redis limiter

Secrets (SECRET_KEY, JWT_SECRET_KEY, ENCRYPTION_KEY, DB_PASSWORD, …)
must come from the environment — never appear in source code.
"""
import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

# ─── Helpers ────────────────────────────────────────────────────────────


def _get_bool(name: str, default: bool = False) -> bool:
    """Read a boolean env var (1/true/yes/on → True)."""
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _parse_expires(value: str, default: timedelta) -> timedelta:
    """Parse strings like '15m', '7d', '3600s' into a timedelta."""
    if not value:
        return default
    match = __import__("re").fullmatch(r"(\d+)\s*([smhdw])?", value.strip())
    if not match:
        return default
    amount, unit = match.groups()
    amount = int(amount)
    unit_map = {"s": "seconds", "m": "minutes", "h": "hours",
                "d": "days", "w": "weeks"}
    return timedelta(**{unit_map.get(unit or "s", "seconds"): amount})


# ─── Base Config ────────────────────────────────────────────────────────


class Config:
    """Base configuration with production-safe defaults."""

    # ── Flask core ──
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    if not SECRET_KEY:
        SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-only-insecure-key-CHANGE-ME")

    # ── JWT (Flask-JWT-Extended) ──
    # Flask-JWT-Extended reads JWT_SECRET_KEY from app.config
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("JWT_SECRET", ""))
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRES = _parse_expires(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "15m"), timedelta(minutes=15)
    )
    JWT_REFRESH_TOKEN_EXPIRES = _parse_expires(
        os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "7d"), timedelta(days=7)
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_IDENTITY_CLAIM = "sub"
    # Token blocklist (revocation) – checked on every authenticated request
    JWT_TOKEN_BLOCKLIST_ENABLED = True
    JWT_TOKEN_BLOCKLIST_CHECKS = ["access", "refresh"]

    # ── Database (psycopg2 connection pool, kept for backward compat) ──
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 5432))
    DB_NAME = os.getenv("DB_NAME", "mental_health_db")
    DATABASE_URL = os.getenv("DATABASE_URL", "")

    # ── Encryption ──
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")

    # ── App ──
    PORT = int(os.getenv("PORT", 4000))
    NODE_ENV = os.getenv("NODE_ENV", "development")
    FLASK_ENV = os.getenv("FLASK_ENV", NODE_ENV)
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── Moderation API ──
    MODERATION_API_URL = os.getenv("MODERATION_API_URL", "http://localhost:8000/generate/")
    MODERATION_TIMEOUT_MS = int(os.getenv("MODERATION_TIMEOUT_MS", 30000))

    # ── Redis (rate-limit storage in production) ──
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # ── Flask-Limiter ──
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", REDIS_URL)
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "300 per minute")
    RATELIMIT_STRATEGY = os.getenv("RATELIMIT_STRATEGY", "fixed-window")
    RATELIMIT_HEADERS_ENABLED = True

    # ── Request limits ──
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))

    # ── Password hashing ──
    BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))

    # ── Proxy ──
    # Number of proxy hops for ProxyFix (set to 2 for nginx + load balancer)
    PROXY_FIX_X_FOR = int(os.getenv("PROXY_FIX_X_FOR", "2"))
    PROXY_FIX_X_PROTO = int(os.getenv("PROXY_FIX_X_PROTO", "1"))
    PROXY_FIX_X_HOST = int(os.getenv("PROXY_FIX_X_HOST", "1"))
    PROXY_FIX_X_PREFIX = int(os.getenv("PROXY_FIX_X_PREFIX", "0"))

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """Build SQLAlchemy database URI from individual env vars or DATABASE_URL."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def DEBUG(self) -> bool:
        return self.NODE_ENV != "production"


class DevelopmentConfig(Config):
    """Development configuration — debug enabled, permissive CORS."""

    DEBUG = True
    RATELIMIT_ENABLED = True  # rate limiting on even in dev


class TestingConfig(Config):
    """Testing configuration — uses SQLite, test secrets, no rate limiting."""

    TESTING = True
    DEBUG = False
    RATELIMIT_ENABLED = False
    JWT_SECRET_KEY = "test-jwt-secret-key-not-for-production"
    SECRET_KEY = "test-flask-secret-key-not-for-production"
    ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    DATABASE_URL = "sqlite:///:memory:"
    DB_USER = ""
    DB_PASSWORD = ""
    DB_HOST = "localhost"
    DB_PORT = 5432
    DB_NAME = "test_db"
    RATELIMIT_STORAGE_URI = "memory://"


class ProductionConfig(Config):
    """Production configuration — all security features enabled."""

    DEBUG = False
    RATELIMIT_ENABLED = True

    def __init__(self):
        # Fail fast if secrets are missing
        if not self.SECRET_KEY or self.SECRET_KEY.startswith("dev-"):
            raise RuntimeError("SECRET_KEY must be set to a secure random value in production")
        if not self.JWT_SECRET_KEY:
            raise RuntimeError("JWT_SECRET_KEY must be set in production")
        if not self.ENCRYPTION_KEY or len(self.ENCRYPTION_KEY) < 32:
            raise RuntimeError("ENCRYPTION_KEY must be at least 32 characters in production")


# ─── Config factory ─────────────────────────────────────────────────────

_config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config() -> Config:
    """Return the appropriate config class instance based on NODE_ENV/FLASK_ENV."""
    env = os.getenv("FLASK_ENV", os.getenv("NODE_ENV", "development"))
    cls = _config_map.get(env, DevelopmentConfig)
    return cls()


# Backward-compatible singleton (existing code does ``from config import config``)
config = get_config()

if not config.JWT_SECRET_KEY:
    print("WARNING: JWT_SECRET_KEY is not set — authentication will fail!")
if not config.ENCRYPTION_KEY or len(config.ENCRYPTION_KEY) < 32:
    print("WARNING: ENCRYPTION_KEY must be at least 32 characters!")
