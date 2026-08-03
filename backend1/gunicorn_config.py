"""
Gunicorn production configuration.

Usage:
    gunicorn -c gunicorn_config.py app:app

Security:
  * Binds to 127.0.0.1 (nginx proxies to this)
  * 4 workers (2 * CPU + 1)
  * 30s timeout for slow moderation API calls
  * Access log + error log to files
  * No debug mode
"""
import multiprocessing
import os

bind = "127.0.0.1:4000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Logging
accesslog = "gunicorn_access.log"
errorlog = "gunicorn_error.log"
loglevel = "warning"

# Security
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190

# Graceful shutdown
graceful_timeout = 10
daemon = False