import asyncio
import re
from urllib.parse import urlparse

import pg8000.dbapi

_connection_config: dict | None = None


def _normalize_query(query: str) -> str:
    # Convert Postgres-style placeholders ($1, $2, ...) to DB-API style (%s).
    return re.sub(r"\$\d+", "%s", query)


def _row_to_dict(cursor, row):
    columns = [desc[0] for desc in cursor.description]
    return {columns[index]: value for index, value in enumerate(row)}


def _connect():
    if _connection_config is None:
        raise RuntimeError("Database connection is not initialized")
    return pg8000.dbapi.connect(**_connection_config)


async def init_pool(database_url: str) -> None:
    global _connection_config
    if _connection_config is not None:
        return

    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")

    parsed = urlparse(database_url)
    _connection_config = {
        "user": parsed.username,
        "password": parsed.password,
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
    }


async def close_pool() -> None:
    global _connection_config
    _connection_config = None


async def fetch(query: str, *args):
    def _run():
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(_normalize_query(query), args)
                rows = cur.fetchall()
                return [_row_to_dict(cur, row) for row in rows]

    return await asyncio.to_thread(_run)


async def fetchrow(query: str, *args):
    def _run():
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(_normalize_query(query), args)
                row = cur.fetchone()
                if row is None:
                    return None
                return _row_to_dict(cur, row)

    return await asyncio.to_thread(_run)


async def execute(query: str, *args):
    def _run():
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(_normalize_query(query), args)
            conn.commit()

    return await asyncio.to_thread(_run)
