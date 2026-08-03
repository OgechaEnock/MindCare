"""
Flask extension singletons.

All Flask extensions are instantiated here so that both app.py and
route modules can import them without circular-import issues.
"""
from __future__ import annotations

from flask_compress import Compress
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["300 per minute"],
    storage_uri="memory://",
    strategy="fixed-window",
)

talisman = Talisman()
compress = Compress()
cors = CORS()
jwt = JWTManager()
