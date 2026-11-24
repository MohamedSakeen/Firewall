"""Account CRUD with validation and no password-hash leakage."""

import sqlite3

from auth.db import db_connection, utc_now
from auth.models import User
from auth.password import (
    hash_password,
    normalize_username,
    password_error,
    verify_for_login,
)

ROLES = ("admin", "operator", "viewer")


class UserExistsError(Exception):
    """Raised when a username is already taken."""


def _row_to_user(row):
    return User(row["id"], row["username"], row["role"], row["disabled"])


def get_user_by_id(user_id):
    """Look up an active or disabled user by id for Flask-Login."""
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _row_to_user(row) if row else None


def get_user_by_username(username):
    """Internal lookup that includes the password hash; never serialize it."""
    normalized = normalize_username(username)
    if normalized is None:
        return None
    with db_connection() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE username = ?", (normalized,)
        ).fetchone()


def authenticate(username, password):
    """Return a User on valid credentials, otherwise None."""
    row = get_user_by_username(username)
    password_hash = row["password_hash"] if row else None
    matches = verify_for_login(password, password_hash) if isinstance(password, str) else False
    if row is None or not matches or row["disabled"]:
        return None
    return _row_to_user(row)


def create_user(username, password, role):
    """Create a user after allow-list validation; raise ValueError on bad input."""
    normalized = normalize_username(username)
    if normalized is None:
        raise ValueError("username must be 3-64 characters: letters, digits, _, ., -")
    error = password_error(password)
    if error:
        raise ValueError(error)
    if role not in ROLES:
        raise ValueError("role must be one of: " + ", ".join(ROLES))

    password_hash = hash_password(password)
    try:
        with db_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash, role, disabled, created_at) "
                "VALUES (?, ?, ?, 0, ?)",
                (normalized, password_hash, role, utc_now()),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as exc:
        raise UserExistsError(normalized) from exc
    return User(user_id, normalized, role)


def list_users():
    """Return all users without password hashes."""
    with db_connection() as conn:
        rows = conn.execute(
            "SELECT id, username, role, disabled FROM users ORDER BY id"
        ).fetchall()
    return [_row_to_user(row) for row in rows]


def disable_user(user_id):
    """Disable a user by id and return the updated safe representation."""
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            return None
        conn.execute("UPDATE users SET disabled = 1 WHERE id = ?", (user_id,))
    return User(row["id"], row["username"], row["role"], True)
