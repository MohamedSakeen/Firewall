"""Shared fixtures for tests that exercise the authenticated API."""

import pytest

from api.api import create_app
from auth.db import init_db
from auth.store import create_user

TEST_PASSWORD = "LabTestPassw0rd!"
ADMIN_USERNAME = "labadmin"
OPERATOR_USERNAME = "laboperator"
VIEWER_USERNAME = "labviewer"

CSRF_HEADER = "X-CSRFToken"


@pytest.fixture
def auth_env(monkeypatch, tmp_path):
    """Point auth at an isolated database and a deterministic test key."""
    db_path = tmp_path / "firewall.db"
    monkeypatch.setenv("FIREWALL_DB_PATH", str(db_path))
    monkeypatch.setenv("FIREWALL_SECRET_KEY", "unit-test-only-not-a-real-secret")
    monkeypatch.delenv("FIREWALL_COOKIE_SECURE", raising=False)
    init_db()
    return db_path


@pytest.fixture
def admin_account(auth_env):
    return create_user(ADMIN_USERNAME, TEST_PASSWORD, "admin")


@pytest.fixture
def operator_account(auth_env):
    return create_user(OPERATOR_USERNAME, TEST_PASSWORD, "operator")


@pytest.fixture
def viewer_account(auth_env):
    return create_user(VIEWER_USERNAME, TEST_PASSWORD, "viewer")


@pytest.fixture
def app(monkeypatch, auth_env, admin_account):
    """Application with a fresh database and no sniffer/origin overrides."""
    monkeypatch.delenv("FIREWALL_ALLOWED_ORIGINS", raising=False)
    monkeypatch.delenv("FIREWALL_ENABLE_SNIFFER", raising=False)
    application = create_app()
    application.config["TESTING"] = True
    return application


def login(client, username, password, csrf_token):
    """Log in with an explicit CSRF token and return the response."""
    return client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
        headers={CSRF_HEADER: csrf_token},
    )


def csrf_token_for(client):
    """Fetch a CSRF token while keeping the returned session cookie."""
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    return response.get_json()["csrf_token"]


@pytest.fixture
def auth_client(app):
    """Client logged in as admin, with CSRF headers added automatically."""
    client = app.test_client()
    token = csrf_token_for(client)
    response = login(client, ADMIN_USERNAME, TEST_PASSWORD, token)
    assert response.status_code == 200, response.get_json()

    original_open = client.open

    def open_with_csrf(*args, **kwargs):
        method = str(kwargs.get("method", "GET")).upper()
        if method in {"POST", "PUT", "PATCH", "DELETE"}:
            headers = dict(kwargs.get("headers") or {})
            headers.setdefault(CSRF_HEADER, token)
            kwargs["headers"] = headers
        return original_open(*args, **kwargs)

    client.open = open_with_csrf
    return client
