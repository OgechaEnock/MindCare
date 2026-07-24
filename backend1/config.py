"""
Centralized configuration loaded from environment variables (.env).
Mirrors the env vars used throughout the original Node/Express backend.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Server
    PORT = int(os.getenv("PORT", 4000))
    NODE_ENV = os.getenv("NODE_ENV", "development")  # kept as NODE_ENV for drop-in .env compatibility
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # PostgreSQL
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 5432))
    DB_NAME = os.getenv("DB_NAME")

    # Encryption
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

    # JWT
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_EXPIRES_IN = os.getenv("JWT_EXPIRES_IN", "7d")

    # Moderation API
    MODERATION_API_URL = os.getenv("MODERATION_API_URL", "http://localhost:8000/generate/")
    MODERATION_TIMEOUT_MS = int(os.getenv("MODERATION_TIMEOUT_MS", 30000))


config = Config()

if not config.ENCRYPTION_KEY or len(config.ENCRYPTION_KEY) < 32:
    print("WARNING: ENCRYPTION_KEY must be at least 32 characters!")