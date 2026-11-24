"""JSON authentication endpoints for the local lab."""

import logging

from flask import Blueprint, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import current_user, login_user, logout_user
from flask_wtf.csrf import generate_csrf

from auth.password import password_error
from auth.store import (
    ROLES,
    UserExistsError,
    authenticate,
    create_user,
    disable_user,
    list_users,
)

logger = logging.getLogger(__name__)

# Created without an app so it can decorate views before create_app() runs.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _error(message, status):
    return jsonify({"error": message}), status


def _require_admin():
    if not current_user.is_authenticated or current_user.role != "admin":
        return _error("forbidden", 403)
    return None


@auth_bp.get("/csrf")
def csrf_token():
    """Issue a CSRF token bound to the current session cookie."""
    return jsonify({"csrf_token": generate_csrf()})


@auth_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    data = _json_body()
    if data is None or set(data) != {"username", "password"}:
        return _error("invalid request", 400)

    if not isinstance(data["username"], str) or not isinstance(data["password"], str):
        return _error("invalid credentials", 401)

    user = authenticate(data["username"], data["password"])
    if user is None:
        return _error("invalid credentials", 401)

    login_user(user)
    return jsonify({"user": user.to_dict()})


@auth_bp.post("/logout")
def logout():
    logout_user()
    return jsonify({"status": "ok"})


@auth_bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return _error("authentication required", 401)
    return jsonify({"user": current_user.to_dict()})


@auth_bp.get("/users")
def users_list():
    denial = _require_admin()
    if denial:
        return denial
    return jsonify({"users": [user.to_dict() for user in list_users()]})


@auth_bp.post("/users")
def users_create():
    denial = _require_admin()
    if denial:
        return denial

    data = _json_body()
    if data is None or set(data) != {"username", "password", "role"}:
        return _error("invalid request", 400)

    error = password_error(data["password"])
    if error:
        return _error(error, 400)
    if data["role"] not in ROLES:
        return _error("invalid role", 400)

    try:
        user = create_user(data["username"], data["password"], data["role"])
    except UserExistsError:
        return _error("username already exists", 409)
    except ValueError as exc:
        return _error(str(exc), 400)
    return jsonify({"user": user.to_dict()}), 201


@auth_bp.post("/users/<int:user_id>/disable")
def users_disable(user_id):
    denial = _require_admin()
    if denial:
        return denial
    if current_user.id == user_id:
        return _error("cannot disable your own account", 400)

    user = disable_user(user_id)
    if user is None:
        return _error("user not found", 404)
    return jsonify({"user": user.to_dict()})
