"""Append-only audit rows for state-changing API requests.

Only method, path, status, identity, and address are recorded. Request bodies,
passwords, and tokens are never written here.
"""

import logging

from flask import request
from flask_login import current_user

from auth.db import db_connection, utc_now

logger = logging.getLogger(__name__)

STATE_CHANGING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def record_audit(method, path, status, user=None, remote_addr=None):
    """Append one audit row; audit failures must not break the request."""
    try:
        with db_connection() as conn:
            conn.execute(
                "INSERT INTO audit_log "
                "(timestamp, user_id, username, role, method, path, status, remote_addr) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    utc_now(),
                    getattr(user, "id", None),
                    getattr(user, "username", None),
                    getattr(user, "role", None),
                    method,
                    path,
                    int(status),
                    remote_addr,
                ),
            )
    except Exception:
        logger.exception("could not write audit record")


def audit_request(response):
    """Flask after_request hook for audit logging."""
    if request.method not in STATE_CHANGING_METHODS or not request.path.startswith("/api/"):
        return response
    user = current_user if current_user.is_authenticated else None
    record_audit(
        request.method,
        request.path,
        response.status_code,
        user=user,
        remote_addr=request.remote_addr,
    )
    return response
