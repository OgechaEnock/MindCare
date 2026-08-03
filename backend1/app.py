"""
Flask application factory — security-hardened.

All security middleware is initialised here in the correct order:

  1. Structured logging (before anything else)
  2. ProxyFix (so Flask sees the real client IP / HTTPS scheme)
  3. Flask-Limiter (rate limiting on every route)
  4. Flask-Talismus (security headers, HSTS, CSP)
  5. Flask-CORS (strict origin whitelist)
  6. Flask-Compress (gzip)
  7. Flask-JWT-Extended (token management)
  8. Blueprint registration
  9. Global error handlers (no info leakage)
"""
from __future__ import annotations

import logging.config
import time

from flask import Flask, g, jsonify, request
from flask_compress import Compress
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from werkzeug.middleware.proxy_fix import ProxyFix

from config import get_config
from db import init_pool
from extensions import limiter, talisman, compress, cors
from middleware.auth import init_jwt
from routes.appointment_routes import appointment_bp
from routes.auth_routes import auth_bp
from routes.forum_routes import forum_bp
from routes.medication_routes import medication_bp
from routes.notification_routes import notification_bp
from routes.profile_routes import profile_bp
from utils.logger import configure_logging, get_logger
from utils.responses import error_response

# ─── Extensions (module-level singletons) ───────────────────────────────

talisman = Talisman()
compress = Compress()
cors = CORS()


def _user_or_ip_key():
    """Rate-limit key: user identity if JWT present, else client IP."""
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        if uid:
            return f"user:{uid}"
    except Exception:
        pass
    return get_remote_address()


def create_app(config_object=None):
    """Application factory."""
    app = Flask(__name__)

    # ── 1. Logging (must be first) ──────────────────────────────────────
    cfg = config_object or get_config()
    app.config.from_object(cfg)
    logging.config.dictConfig(configure_logging(
        level="DEBUG" if cfg.DEBUG else "INFO"
    ))
    logger = get_logger("mindcare.app")
    logger.info("Creating Flask app", extra={
        "environment": cfg.NODE_ENV,
        "debug": cfg.DEBUG,
    })

    # ── 2. Request body size limit ──────────────────────────────────────
    app.config["MAX_CONTENT_LENGTH"] = cfg.MAX_CONTENT_LENGTH

    # ── 3. ProxyFix (nginx -> gunicorn -> Flask) ────────────────────────
    app.wsgi_app = ProxyFix(
        app.wsgi_app,
        x_for=cfg.PROXY_FIX_X_FOR,
        x_proto=cfg.PROXY_FIX_X_PROTO,
        x_host=cfg.PROXY_FIX_X_HOST,
        x_prefix=cfg.PROXY_FIX_X_PREFIX,
    )

    # ── 4. Flask-Limiter ────────────────────────────────────────────────
    limiter.storage_uri = cfg.RATELIMIT_STORAGE_URI
    limiter.strategy = cfg.RATELIMIT_STRATEGY
    limiter.init_app(app)

    # ── 5. Flask-Talismus (security headers + HTTPS) ────────────────────
    csp = {
        "default-src": "'none'",
        "frame-ancestors": "'none'",
        "base-uri": "'none'",
        "object-src": "'none'",
    }
    csp_kwargs = {
        "content_security_policy": csp,
        "frame_options": "DENY",
        "referrer_policy": "strict-origin-when-cross-origin",
        "permissions_policy": {
            "geolocation": "()",
            "camera": "()",
            "microphone": "()",
            "payment": "()",
        },
    }
    if cfg.DEBUG:
        talisman.init_app(app, force_https=False, strict_transport_security=False, **csp_kwargs)
    else:
        talisman.init_app(
            app,
            force_https=True,
            strict_transport_security={
                "max-age": 31536000,
                "includeSubDomains": True,
                "preload": True,
            },
            **csp_kwargs,
        )
    logger.info("Talisman security headers configured")

    # ── 6. Flask-Compress ───────────────────────────────────────────────
    compress.init_app(app)

    # ── 7. Flask-CORS (strict origin whitelist) ─────────────────────────
    cors.init_app(
        app,
        origins=[cfg.FRONTEND_URL],
        methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["X-Total-Count", "X-Page", "X-Total-Pages"],
        supports_credentials=True,
        max_age=600,
    )
    logger.info("CORS configured", extra={"origins": [cfg.FRONTEND_URL]})

    # ── 8. Flask-JWT-Extended ────────────────────────────────────────────
    init_jwt(app)
    logger.info("JWT manager initialised")

    # ── 9. Blueprint registration ───────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(medication_bp)
    app.register_blueprint(appointment_bp)
    app.register_blueprint(forum_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(notification_bp)
    logger.info("Blueprints registered", extra={
        "blueprints": list(app.blueprints.keys())
    })

    # ── 10. Request logging ─────────────────────────────────────────────
    import uuid as _uuid

    @app.before_request
    def _log_and_timestamp():
        g.request_start = time.time()
        g.request_id = str(_uuid.uuid4())

    @app.after_request
    def _log_response(resp):
        duration = (time.time() - getattr(g, "request_start", time.time())) * 1000
        if resp.status_code < 500:
            app.logger.info(
                "Request completed",
                extra={
                    "request_id": getattr(g, "request_id", "-"),
                    "method": request.method,
                    "path": request.path,
                    "status": resp.status_code,
                    "duration_ms": round(duration, 2),
                    "ip": request.remote_addr or "-",
                },
            )
        resp.headers["X-Request-ID"] = getattr(g, "request_id", "-")
        return resp

    # ── 11. Health check (sanitized) ────────────────────────────────────
    @app.get("/api/health")
    @limiter.limit("100 per minute", key_func=get_remote_address)
    def health_check():
        from db import get_pool
        try:
            pool = get_pool()
            conn = pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
            finally:
                pool.putconn(conn)
            return jsonify({
                "success": True,
                "message": "Service is operational",
                "data": {"status": "healthy"},
            })
        except Exception:
            return jsonify({
                "success": False,
                "message": "Service unavailable",
                "data": {"status": "unhealthy"},
            }), 503

    # ── 12. Global error handlers ───────────────────────────────────────
    @app.errorhandler(400)
    def _bad_request(err):
        return error_response("Bad request", status=400)

    @app.errorhandler(401)
    def _unauthorized(err):
        return error_response("Unauthorized", status=401)

    @app.errorhandler(403)
    def _forbidden(err):
        return error_response("Forbidden", status=403)

    @app.errorhandler(404)
    def _not_found(err):
        return error_response("Resource not found", status=404)

    @app.errorhandler(405)
    def _method_not_allowed(err):
        return error_response("Method not allowed for this endpoint", status=405)

    @app.errorhandler(413)
    def _too_large(err):
        return error_response("Request body too large (max 10 MB)", status=413)

    @app.errorhandler(429)
    def _rate_limited(err):
        retry_after = getattr(err, "retry_after", None)
        resp = jsonify({
            "success": False,
            "message": "Rate limit exceeded. Please slow down.",
            "errors": ["Too many requests"],
        })
        resp.status_code = 429
        if retry_after:
            resp.headers["Retry-After"] = str(retry_after)
        return resp

    @app.errorhandler(500)
    def _internal_error(err):
        app.logger.error(
            "Unhandled exception",
            extra={
                "path": request.path,
                "method": request.method,
                "error_type": type(err).__name__,
            },
            exc_info=True,
        )
        return error_response(
            "An internal server error occurred. Please try again later.",
            status=500,
        )

    @app.errorhandler(Exception)
    def _catch_all(err):
        # Let the specific HTTP error handlers above deal with known statuses
        from werkzeug.exceptions import HTTPException
        if isinstance(err, HTTPException) and err.code in (400, 401, 403, 404, 405, 413, 429):
            return err
        app.logger.error(
            "Unhandled exception",
            extra={
                "path": request.path,
                "method": request.method,
                "error_type": type(err).__name__,
            },
            exc_info=True,
        )
        return error_response("Internal server error", status=500)

    # ── 13. Initialise DB pool ──────────────────────────────────────────
    try:
        init_pool()
    except Exception as err:
        logger.error("DB pool init failed", extra={"error": str(err)})

    logger.info("Flask app created successfully")
    return app


# ─── Module-level app instance (for gunicorn) ────────────────────────────

app = create_app()


if __name__ == "__main__":
    from utils.scheduler import initialize_scheduler

    port = app.config["PORT"]
    env = app.config["NODE_ENV"]

    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║     MindCare Backend — Security Hardened                  ║
    ║   Port: {str(port):<8}  Environment: {env:<12}    ║
    ║   Security: JWT-Extended | RBAC | Rate Limit | Talisman    ║
    ║   Status: Running                                         ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    # gunicorn is used in production; this block is dev-only.
    app.run(host="127.0.0.1", port=port, debug=False)
