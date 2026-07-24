"""
PostgreSQL connection pool + query helper.
Equivalent to config/db.js (node-postgres Pool).
"""
import psycopg2
from psycopg2 import pool as pg_pool
from psycopg2.extras import RealDictCursor

from config import config

_pool = None


def init_pool():
    global _pool
    if _pool is not None:
        return _pool
    try:
        _pool = pg_pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            host=config.DB_HOST,
            port=config.DB_PORT,
            dbname=config.DB_NAME,
        )
        # Sanity check the connection, same as the Node version's pool.connect() check
        conn = _pool.getconn()
        _pool.putconn(conn)
        print("Connected to PostgreSQL database successfully!")
    except Exception as err:
        print(f"Database connection failed: {err}")
        raise
    return _pool


def get_pool():
    if _pool is None:
        return init_pool()
    return _pool


def query(sql, params=None):
    """
    Runs a query and returns a list of dict rows, mirroring result.rows
    from node-postgres. Works for SELECT as well as INSERT/UPDATE/DELETE
    ... RETURNING statements.
    """
    p = get_pool()
    conn = p.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            if cur.description:  # query returned rows (SELECT or RETURNING)
                rows = cur.fetchall()
            else:
                rows = []
            conn.commit()
            return rows
    except Exception:
        conn.rollback()
        raise
    finally:
        p.putconn(conn)