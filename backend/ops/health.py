"""Authenticated operational health snapshot.

The payload intentionally contains only booleans, counts, small configuration
strings and timestamps. It never includes packet IPs, secrets or file paths.
"""

import logging
import sqlite3
import time

from ops import alerts

logger = logging.getLogger(__name__)

_STARTED_AT = time.monotonic()


def build_health_snapshot():
    """Collect a safe health snapshot for the authenticated ops endpoint."""
    db_ok = True
    schema_version = None
    user_count = 0
    event_count = 0
    response_action_count = 0
    last_event_timestamp = None

    try:
        from auth.db import db_connection

        with db_connection() as conn:
            if conn.execute("SELECT 1").fetchone() is None:
                db_ok = False
            row = conn.execute("PRAGMA user_version").fetchone()
            schema_version = int(row[0]) if row else None
            user_count = int(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0])
            try:
                event_count = int(conn.execute("SELECT COUNT(*) FROM events").fetchone()[0])
                row = conn.execute("SELECT MAX(timestamp) FROM events").fetchone()
                last_event_timestamp = row[0] if row else None
            except sqlite3.Error:
                pass
            try:
                response_action_count = int(
                    conn.execute("SELECT COUNT(*) FROM response_actions").fetchone()[0]
                )
            except sqlite3.Error:
                pass
    except Exception:
        logger.warning("health snapshot could not read the database")
        db_ok = False

    try:
        from api.api import sniffer_enabled

        sniffer = bool(sniffer_enabled())
    except Exception:
        sniffer = False

    try:
        from engine.IPS.response_controller import get_response_mode

        response_mode = get_response_mode()
    except Exception:
        response_mode = "unknown"

    try:
        from engine.response.policy.autonomy_engine import global_autonomy_engine

        autonomy_level = global_autonomy_engine.current_level
        kill_switch_active = bool(global_autonomy_engine.kill_switch_active)
    except Exception:
        autonomy_level = "unknown"
        kill_switch_active = False

    try:
        recent_errors = alerts.recent_error_count()
    except Exception:
        recent_errors = 0

    uptime = max(0.0, time.monotonic() - _STARTED_AT)
    return {
        "db_ok": db_ok,
        "schema_version": schema_version,
        "user_count": user_count,
        "event_count": event_count,
        "response_action_count": response_action_count,
        "sniffer_enabled": sniffer,
        "response_mode": response_mode,
        "autonomy_level": autonomy_level,
        "kill_switch_active": kill_switch_active,
        "last_event_timestamp": last_event_timestamp,
        "uptime_seconds": round(uptime, 1),
        "recent_error_count": recent_errors,
    }
