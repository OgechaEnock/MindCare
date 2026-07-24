"""
Equivalent to server.js
"""
from flask import Flask, jsonify, request
from flask_cors import CORS

from config import config
from db import get_pool, init_pool
from routes.appointment_routes import appointment_bp
from routes.auth_routes import auth_bp
from routes.forum_routes import forum_bp
from routes.medication_routes import medication_bp
from routes.notification_routes import notification_bp
from routes.profile_routes import profile_bp
from utils.scheduler import initialize_scheduler


def create_app():
    app = Flask(__name__)

    # Middleware
    CORS(app, origins=[config.FRONTEND_URL], supports_credentials=True)

    # Request logging middleware
    if config.NODE_ENV != "production":
        @app.before_request
        def log_request():
            print(f"{request.method} {request.path}")

    # API routes
    app.register_blueprint(auth_bp)
    app.register_blueprint(medication_bp)
    app.register_blueprint(appointment_bp)
    app.register_blueprint(forum_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(notification_bp)

    # Health check endpoint
    @app.get("/api/health")
    def health_check():
        try:
            pool = get_pool()
            conn = pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT NOW()")
                    server_time = cur.fetchone()[0]
            finally:
                pool.putconn(conn)

            return jsonify({
                "status": "Server is running",
                "database": "Connected",
                "server_time": server_time,
            })
        except Exception as err:
            return jsonify({
                "status": "Server error",
                "database": "Disconnected",
                "error": str(err),
            }), 500

    # 404 handler
    @app.errorhandler(404)
    def not_found(_err):
        return jsonify({"error": "Route not found"}), 404

    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(err):
        print(f"Global error: {err}")
        status = getattr(err, "code", 500)
        if not isinstance(status, int):
            status = 500
        payload = {"error": str(err) or "Internal server error"}
        return jsonify(payload), status

    return app


app = create_app()

if __name__ == "__main__":
    init_pool()
    initialize_scheduler()

    print(f"""
╔════════════════════════════════════════╗
║  Mental Health Support App Backend    ║
║  Port: {config.PORT}                            ║
║  Environment: {config.NODE_ENV}           ║
║  Status: Running                    ║
║  Notifications: Active              ║
╚════════════════════════════════════════╝
    """)

    app.run(host="0.0.0.0", port=config.PORT, debug=(config.NODE_ENV != "production"))