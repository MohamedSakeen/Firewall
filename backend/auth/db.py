"""SQLite persistence for accounts and audit records.

All access goes through parameterized queries. The database path comes from
FIREWALL_DB_PATH and defaults to backend/data/firewall.db.
"""

import ipaddress
import json
import logging
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "firewall.db"

SCHEMA_VERSION = 3

# Durable event types accepted by storage.events. Kept here so the SQL CHECK
# constraint and the Python allow-list cannot drift apart.
EVENT_TYPES = ("packet", "alert", "incident", "block", "security_event")

EVENT_TYPE_VALUES = ", ".join("'" + value + "'" for value in EVENT_TYPES)

# Statuses recorded for response proposals, approvals and manual enforcement.
# Kept here so the SQL CHECK constraint and Python validation cannot drift.
RESPONSE_ACTION_STATUSES = (
    "PROPOSED",
    "PENDING_APPROVAL",
    "ENFORCED",
    "REJECTED",
    "IGNORED",
    "FAILED",
    "UNBLOCKED",
    "ROLLED_BACK",
)

RESPONSE_ACTION_STATUS_VALUES = ", ".join(
    "'" + value + "'" for value in RESPONSE_ACTION_STATUSES
)

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

RESPONSE_ACTION_SCHEMA = f"""
CREATE TABLE IF NOT EXISTS response_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    action_id TEXT NOT NULL UNIQUE,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    ip TEXT NOT NULL,
    reason TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ({RESPONSE_ACTION_STATUS_VALUES})),
    details TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_response_actions_timestamp ON response_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_response_actions_status ON response_actions(status);
CREATE INDEX IF NOT EXISTS idx_response_actions_ip ON response_actions(ip);
"""

# Each entry is applied once, in order, when the database's user_version is
# lower than its version. New schema changes should add a new migration here.
MIGRATIONS = {
    1: SCHEMA,
    2: EVENT_SCHEMA,
    3: RESPONSE_ACTION_SCHEMA,
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
                conn.executescript(RESPONSE_ACTION_SCHEMA)
    try:
        os.chmod(path, 0o600)
    except OSError:
        logger.warning("could not restrict permissions on the auth database")


# Response action log helpers. All values are validated and parameterized;
# details are scrubbed so credentials or CSRF values never reach SQLite.
MAX_ACTION_FIELD_LENGTH = 200
MAX_DETAILS_LENGTH = 4096
MAX_DETAILS_DEPTH = 4
MAX_DETAILS_ITEMS = 50
SENSITIVE_KEY_PARTS = (
    "password",
    "passwd",
    "pwd",
    "token",
    "secret",
    "credential",
    "authorization",
    "api_key",
    "apikey",
    "cookie",
    "csrf",
    "session",
)
BEARER_RE = re.compile(r"(?i)(bearer\s+)[^\s]+")
REDACTED = "[REDACTED]"


def _clean_action_text(value, name, allow_empty=False):
    if not isinstance(value, str):
        raise ValueError(f"{name} must be a string")
    text = " ".join(BEARER_RE.sub(r"\1" + REDACTED, value).split())
    if not allow_empty and not text:
        raise ValueError(f"{name} is required")
    return text[:MAX_ACTION_FIELD_LENGTH]


def _validate_action_id(action_id):
    return _clean_action_text(action_id, "action_id")


def _validate_status(status):
    if status not in RESPONSE_ACTION_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(RESPONSE_ACTION_STATUSES)}")
    return status


def _validate_ip(ip):
    text = _clean_action_text(ip, "ip", allow_empty=True)
    if not text:
        return ""
    try:
        return str(ipaddress.ip_address(text))
    except ValueError as exc:
        raise ValueError("ip must be a valid IP address") from exc


def _sanitize_details(details, depth=0):
    if depth > MAX_DETAILS_DEPTH:
        return REDACTED
    if details is None:
        return {}
    if not isinstance(details, dict):
        raise ValueError("details must be a mapping")
    cleaned = {}
    for key, value in list(details.items())[:MAX_DETAILS_ITEMS]:
        name = str(key)[:MAX_ACTION_FIELD_LENGTH]
        if any(part in name.lower() for part in SENSITIVE_KEY_PARTS):
            cleaned[name] = REDACTED
        elif isinstance(value, str):
            cleaned[name] = " ".join(BEARER_RE.sub(r"\1" + REDACTED, value).split())[:MAX_DETAILS_LENGTH]
        elif isinstance(value, dict):
            cleaned[name] = _sanitize_details(value, depth + 1)
        elif isinstance(value, (list, tuple)):
            cleaned[name] = [
                _sanitize_details({"item": item}, depth + 1)["item"]
                for item in list(value)[:MAX_DETAILS_ITEMS]
            ]
        elif isinstance(value, (bool, int, float)) or value is None:
            cleaned[name] = value
        else:
            cleaned[name] = f"<{type(value).__name__}>"
    return cleaned


def _details_json(details):
    text = json.dumps(_sanitize_details(details), sort_keys=True, separators=(",", ":"))
    if len(text) > MAX_DETAILS_LENGTH:
        text = json.dumps(
            {"truncated": True, "preview": text[:MAX_DETAILS_LENGTH // 2]},
            sort_keys=True,
            separators=(",", ":"),
        )
    return text


def ensure_response_schema():
    """Create the response_actions table on demand for callers that skip init_db()."""
    with db_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'response_actions'"
        ).fetchone()
    if exists is None:
        init_db()


def record_response_action(
    action_id,
    actor,
    action,
    ip,
    reason,
    mode,
    status,
    details=None,
    timestamp=None,
):
    """Insert one durable response action and return its integer id."""
    values = (
        timestamp or utc_now(),
        _validate_action_id(action_id),
        _clean_action_text(actor, "actor"),
        _clean_action_text(action, "action"),
        _validate_ip(ip),
        _clean_action_text(reason, "reason", allow_empty=True),
        _clean_action_text(mode, "mode"),
        _validate_status(status),
        _details_json(details),
    )
    ensure_response_schema()
    with db_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO response_actions "
            "(timestamp, action_id, actor, action, ip, reason, mode, status, details) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            values,
        )
        return int(cursor.lastrowid)


def _row_to_response_action(row):
    try:
        details = json.loads(row["details"])
    except (TypeError, ValueError):
        details = {}
    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "action_id": row["action_id"],
        "actor": row["actor"],
        "action": row["action"],
        "ip": row["ip"],
        "reason": row["reason"],
        "mode": row["mode"],
        "status": row["status"],
        "details": details,
    }


def list_response_actions(limit=100, status=None, ip=None, action_id=None):
    """Return recent response actions, newest first, with details decoded."""
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 1000:
        raise ValueError("limit must be an integer between 1 and 1000")

    clauses = []
    params = []
    if status is not None:
        clauses.append("status = ?")
        params.append(_validate_status(status))
    if ip is not None:
        clauses.append("ip = ?")
        params.append(_validate_ip(ip))
    if action_id is not None:
        clauses.append("action_id = ?")
        params.append(_validate_action_id(action_id))

    query = (
        "SELECT id, timestamp, action_id, actor, action, ip, reason, mode, status, details "
        "FROM response_actions"
        + (" WHERE " + " AND ".join(clauses) if clauses else "")
        + " ORDER BY timestamp DESC, id DESC LIMIT ?"
    )
    params.append(limit)
    ensure_response_schema()
    with db_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_response_action(row) for row in rows]


def update_response_action(action_id, status=None, details=None):
    """Update a response action's status and merge sanitized details.

    Returns the updated record, or None when the action_id is unknown.
    """
    action_id = _validate_action_id(action_id)
    if status is not None:
        status = _validate_status(status)
    ensure_response_schema()
    with db_connection() as conn:
        row = conn.execute(
            "SELECT status, details FROM response_actions WHERE action_id = ?",
            (action_id,),
        ).fetchone()
        if row is None:
            return None
        try:
            merged = json.loads(row["details"])
            if not isinstance(merged, dict):
                merged = {}
        except (TypeError, ValueError):
            merged = {}
        if details:
            merged.update(_sanitize_details(details))
        merged["updated_at"] = utc_now()
        conn.execute(
            "UPDATE response_actions SET status = ?, details = ? WHERE action_id = ?",
            (status or row["status"], json.dumps(merged, sort_keys=True, separators=(",", ":")), action_id),
        )
        updated = conn.execute(
            "SELECT id, timestamp, action_id, actor, action, ip, reason, mode, status, details "
            "FROM response_actions WHERE action_id = ?",
            (action_id,),
        ).fetchone()
    return _row_to_response_action(updated)
