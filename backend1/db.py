"""
PostgreSQL connection pool + parameterized query helper.

Keeps the existing psycopg2 ``ThreadedConnectionPool`` layer (already
SQL-injection-safe via ``%s`` placeholders) but adds structured logging
and token-blocklist helpers used by Flask-JWT-Extended's revocation flow.
"""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any, Sequence

import psycopg2.pool as pg_pool
from psycopg2.extras import RealDictCursor

from config import config
from utils.logger import get_logger

logger = get_logger(__name__)

_pool: pg_pool.ThreadedConnectionPool | None = None
_lock = threading.Lock()


def init_pool() -> pg_pool.ThreadedConnectionPool:
    """Initialize the global connection pool (thread-safe singleton)."""
    global _pool
    if _pool is not None:
        return _pool
    with _lock:
        if _pool is not None:
            return _pool
        try:
            _pool = pg_pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=20,
                user=config.DB_USER,
                password=config.DB_PASSWORD,
                host=config.DB_HOST,
                port=config.DB_PORT,
                dbname=config.DB_NAME,
            )
            # Sanity-check the connection
            conn = _pool.getconn()
            _pool.putconn(conn)
            logger.info("PostgreSQL connection pool initialized")
        except Exception as err:
            logger.error("Database connection failed", extra={"error": str(err)})
            raise
    return _pool


def get_pool() -> pg_pool.ThreadedConnectionPool:
    """Return the pool, initializing it lazily if needed."""
    if _pool is None:
        return init_pool()
    return _pool


def query(sql: str, params: Sequence[Any] | None = None) -> list[dict]:
    """
    Execute a **parameterized** SQL statement and return results as a list of
    dicts (mirroring ``node-postgres`` ``result.rows``).

    All caller-supplied values MUST be passed via *params* — never string-
    formatted into *sql*.  This is the single choke-point for SQL injection
    prevention.
    """
    pool = get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            if cur.description:  # SELECT / RETURNING
                rows = cur.fetchall()
            else:                # INSERT / UPDATE / DELETE without RETURNING
                rows = []
            conn.commit()
            return rows
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


# ─── Token blocklist helpers (used by Flask-JWT-Extended revocation) ───

def is_token_revoked(jti: str) -> bool:
    """Return *True* if *jti* is in the active blocklist."""
    rows = query(
        "SELECT 1 FROM token_blocklist WHERE jti = %s AND expires_at > NOW() LIMIT 1",
        (jti,),
    )
    return len(rows) > 0


def revoke_token(jti: str, token_type: str, expires_at: datetime | None) -> None:
    """Add a token's JTI to the blocklist so it can no longer be used."""
    query(
        "INSERT INTO token_blocklist (jti, token_type, expires_at, created_at) "
        "VALUES (%s, %s, %s, NOW())",
        (jti, token_type, expires_at),
    )
    logger.info("Token revoked", extra={"token_type": token_type})
