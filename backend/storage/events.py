"""Durable, append-only event storage for captured telemetry.

All queries are parameterized and event types are allow-listed. Payloads are
sanitized before they reach SQLite so credentials and tokens are never written
to disk as event details.
"""

import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone

from auth.db import EVENT_TYPES, db_connection, init_db, utc_now

logger = logging.getLogger(__name__)

ALLOWED_EVENT_TYPES = frozenset(EVENT_TYPES)
DEFAULT_RETENTION_DAYS = 30
MAX_RETENTION_DAYS = 3650
MAX_LIST_LIMIT = 1000
MAX_DETAILS_LENGTH = 8192
MAX_STRING_LENGTH = 512
MAX_KEY_LENGTH = 64
MAX_ITEMS = 100
MAX_DEPTH = 4

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


def get_retention_days():
    """Read FIREWALL_EVENT_RETENTION_DAYS, falling back to 30 days."""
    raw = os.getenv("FIREWALL_EVENT_RETENTION_DAYS", "").strip()
    if not raw:
        return DEFAULT_RETENTION_DAYS
    try:
        days = int(raw)
    except ValueError:
        logger.warning("Invalid FIREWALL_EVENT_RETENTION_DAYS; using %d", DEFAULT_RETENTION_DAYS)
        return DEFAULT_RETENTION_DAYS
    if not 1 <= days <= MAX_RETENTION_DAYS:
        logger.warning(
            "FIREWALL_EVENT_RETENTION_DAYS must be between 1 and %d; using %d",
            MAX_RETENTION_DAYS,
            DEFAULT_RETENTION_DAYS,
        )
        return DEFAULT_RETENTION_DAYS
    return days


def _validate_days(days):
    if isinstance(days, bool) or not isinstance(days, int):
        raise ValueError("days must be a positive integer")
    if not 1 <= days <= MAX_RETENTION_DAYS:
        raise ValueError(f"days must be between 1 and {MAX_RETENTION_DAYS}")
    return days


def _validate_event_type(event_type):
    if not isinstance(event_type, str):
        raise ValueError("event_type must be one of: " + ", ".join(sorted(ALLOWED_EVENT_TYPES)))
    normalized = event_type.strip().lower()
    if normalized not in ALLOWED_EVENT_TYPES:
        raise ValueError("event_type must be one of: " + ", ".join(sorted(ALLOWED_EVENT_TYPES)))
    return normalized


def _normalize_since(since):
    if isinstance(since, datetime):
        value = since
    elif isinstance(since, str):
        try:
            value = datetime.fromisoformat(since.strip().replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError("since must be an ISO 8601 timestamp") from exc
    else:
        raise ValueError("since must be an ISO 8601 timestamp")
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat(timespec="seconds")


def _clean_scalar(value):
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return BEARER_RE.sub(r"\1" + REDACTED, value)[:MAX_STRING_LENGTH]
    # Never serialize arbitrary object reprs: they can contain credentials.
    return f"<{type(value).__name__}>"


def _sanitize(value, depth=0):
    if depth > MAX_DEPTH:
        return "[TRUNCATED]"
    if isinstance(value, dict):
        cleaned = {}
        for key, item in value.items():
            name = str(key)[:MAX_KEY_LENGTH]
            if any(part in name.lower() for part in SENSITIVE_KEY_PARTS):
                cleaned[name] = REDACTED
            else:
                cleaned[name] = _sanitize(item, depth + 1)
        return cleaned
    if isinstance(value, (list, tuple, set)):
        return [_sanitize(item, depth + 1) for item in list(value)[:MAX_ITEMS]]
    return _clean_scalar(value)


def _details_json(payload):
    cleaned = _sanitize(payload)
    try:
        text = json.dumps(cleaned, sort_keys=True, separators=(",", ":"))
    except (TypeError, ValueError):
        text = json.dumps({"error": "unserializable payload"}, separators=(",", ":"))
    if len(text) > MAX_DETAILS_LENGTH:
        text = json.dumps(
            {"truncated": True, "preview": text[:MAX_DETAILS_LENGTH // 2]},
            separators=(",", ":"),
        )
    return text


def _source_ip(payload):
    for key in ("src_ip", "source_ip", "attacker_ip", "ip"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()[:MAX_STRING_LENGTH]
    return None


def ensure_event_schema():
    """Create the events table on demand for callers that skip init_db()."""
    with db_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'events'"
        ).fetchone()
    if exists is None:
        init_db()


def record_event(event_type, payload=None):
    """Insert one durable event and return its integer id."""
    normalized = _validate_event_type(event_type)
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError("payload must be a mapping")
    ensure_event_schema()
    with db_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO events (timestamp, event_type, source_ip, details) "
            "VALUES (?, ?, ?, ?)",
            (
                utc_now(),
                normalized,
                _source_ip(payload),
                _details_json(payload),
            ),
        )
        return int(cursor.lastrowid)


def _row_to_event(row):
    try:
        details = json.loads(row["details"])
    except (TypeError, ValueError):
        details = {}
    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "event_type": row["event_type"],
        "source_ip": row["source_ip"],
        "details": details,
    }


def list_events(limit=100, event_type=None, since=None):
    """Return stored events, newest first, with details decoded from JSON."""
    if isinstance(limit, bool) or not isinstance(limit, int):
        raise ValueError("limit must be a positive integer")
    if not 1 <= limit <= MAX_LIST_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_LIST_LIMIT}")

    clauses = []
    params = []
    if event_type is not None:
        clauses.append("event_type = ?")
        params.append(_validate_event_type(event_type))
    if since is not None:
        clauses.append("timestamp >= ?")
        params.append(_normalize_since(since))

    query = (
        "SELECT id, timestamp, event_type, source_ip, details FROM events"
        + (" WHERE " + " AND ".join(clauses) if clauses else "")
        + " ORDER BY timestamp DESC, id DESC LIMIT ?"
    )
    params.append(limit)

    ensure_event_schema()
    with db_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_event(row) for row in rows]


def prune_events(days=None):
    """Delete events older than the retention window and return the row count."""
    days = get_retention_days() if days is None else _validate_days(days)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(timespec="seconds")
    ensure_event_schema()
    with db_connection() as conn:
        cursor = conn.execute("DELETE FROM events WHERE timestamp < ?", (cutoff,))
        return int(cursor.rowcount)


def event_count(event_type=None):
    """Return the number of stored events, optionally for one event type."""
    query = "SELECT COUNT(*) FROM events"
    params = ()
    if event_type is not None:
        query += " WHERE event_type = ?"
        params = (_validate_event_type(event_type),)
    ensure_event_schema()
    with db_connection() as conn:
        return int(conn.execute(query, params).fetchone()[0])


def event_counts_by_type():
    """Return an event-type to count mapping for maintenance reporting."""
    ensure_event_schema()
    with db_connection() as conn:
        rows = conn.execute(
            "SELECT event_type, COUNT(*) AS count FROM events "
            "GROUP BY event_type ORDER BY event_type"
        ).fetchall()
    return {row["event_type"]: int(row["count"]) for row in rows}
