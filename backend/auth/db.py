"""SQLite persistence for accounts and audit records.

All access goes through parameterized queries. The database path comes from
FIREWALL_DB_PATH and defaults to backend/data/firewall.db.
"""

import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "firewall.db"

SCHEMA_VERSION = 2

# Durable event types accepted by storage.events. Kept here so the SQL CHECK
# constraint and the Python allow-list cannot drift apart.
EVENT_TYPES = ("packet", "alert", "incident", "block", "security_event")

EVENT_TYPE_VALUES = ", ".join("'" + value + "'" for value in EVENT_TYPES)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
    disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1)),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    user_id INTEGER,
    username TEXT,
    role TEXT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    remote_addr TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
"""

EVENT_SCHEMA = f"""
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ({EVENT_TYPE_VALUES})),
    source_ip TEXT,
    details TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events(event_type, timestamp);
"""

# Each entry is applied once, in order, when the database's user_version is
# lower than its version. New schema changes should add a new migration here.
MIGRATIONS = {
    1: SCHEMA,
    2: EVENT_SCHEMA,
}


def utc_now():
    """Return a stable UTC timestamp for database rows."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_db_path():
    """Resolve FIREWALL_DB_PATH relative to the backend directory."""
    raw = os.getenv("FIREWALL_DB_PATH", "").strip()
    path = Path(raw).expanduser() if raw else DEFAULT_DB_PATH
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return path


@contextmanager
def db_connection():
    """Yield a connection with safe defaults, committing or rolling back."""
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    conn = sqlite3.connect(str(path), timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        yield conn
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.close()


def _schema_version(conn):
    row = conn.execute("PRAGMA user_version").fetchone()
    return int(row[0]) if row else 0


def init_db():
    """Apply pending schema migrations and restrict database file permissions."""
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with db_connection() as conn:
        version = _schema_version(conn)
        if version > SCHEMA_VERSION:
            logger.warning(
                "database schema version %d is newer than supported version %d",
                version,
                SCHEMA_VERSION,
            )
        else:
            for target in sorted(MIGRATIONS):
                if target > version:
                    conn.executescript(MIGRATIONS[target])
                    conn.execute(f"PRAGMA user_version = {target}")
            if version == SCHEMA_VERSION:
                # Re-apply idempotent DDL to repair a missing table or index.
                conn.executescript(SCHEMA)
                conn.executescript(EVENT_SCHEMA)
    try:
        os.chmod(path, 0o600)
    except OSError:
        logger.warning("could not restrict permissions on the auth database")
