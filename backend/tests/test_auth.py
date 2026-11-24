"""Authentication, authorization, CSRF, rate limiting, and audit tests."""

import pytest

from api.routes import ips as ips_mod
from auth.db import db_connection
from conftest import (
    ADMIN_USERNAME,
    CSRF_HEADER,
    OPERATOR_USERNAME,
    TEST_PASSWORD,
    VIEWER_USERNAME,
    csrf_token_for,
    login,
)

BLOCK_PAYLOAD = {"ip": "192.0.2.33", "reason": "auth test", "duration": 60}


@pytest.fixture
def client_and_token(app):
    client = app.test_client()
    return client, csrf_token_for(client)


def test_unauthenticated_block_rejected(client_and_token, monkeypatch):
    client, token = client_and_token
    monkeypatch.setattr(ips_mod, "block_ip", lambda ip: pytest.fail("must not enforce"))

    response = client.post(
        "/api/block", json=BLOCK_PAYLOAD, headers={CSRF_HEADER: token}
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "authentication required"}


def test_head_requires_login_but_preflight_is_allowed(app, admin_account):
    client = app.test_client()
    assert client.head("/api/blocked").status_code == 401
    assert client.open("/api/blocked", method="OPTIONS").status_code == 200


def test_wrong_password_and_unknown_user_are_generic_401(client_and_token):
    client, token = client_and_token
    wrong_password = login(client, ADMIN_USERNAME, "NotTheRightPassw0rd!", token)
    unknown_user = login(client, "no-such-user", "NotTheRightPassw0rd!", token)

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.get_json() == unknown_user.get_json()
    assert wrong_password.get_json() == {"error": "invalid credentials"}


def test_login_success(app, admin_account):
    client = app.test_client()
    token = csrf_token_for(client)

    response = login(client, ADMIN_USERNAME, TEST_PASSWORD, token)
    assert response.status_code == 200
    assert response.get_json() == {
        "user": {
            "id": admin_account.id,
            "username": ADMIN_USERNAME,
            "role": "admin",
        }
    }
    assert client.get("/api/auth/me").get_json()["user"]["username"] == ADMIN_USERNAME


def test_csrf_token_required(app, admin_account):
    client = app.test_client()
    assert client.post(
        "/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": TEST_PASSWORD},
    ).status_code == 400

    token = csrf_token_for(client)
    assert login(client, ADMIN_USERNAME, TEST_PASSWORD, token).status_code == 200
    assert client.post("/api/block", json=BLOCK_PAYLOAD).status_code == 400


def test_viewer_cannot_block(app, viewer_account, monkeypatch):
    client = app.test_client()
    token = csrf_token_for(client)
    assert login(client, VIEWER_USERNAME, TEST_PASSWORD, token).status_code == 200
    monkeypatch.setattr(ips_mod, "block_ip", lambda ip: pytest.fail("viewer must not enforce"))

    assert client.get("/api/blocked").status_code == 200
    response = client.post(
        "/api/block", json=BLOCK_PAYLOAD, headers={CSRF_HEADER: token}
    )
    assert response.status_code == 403
    assert response.get_json() == {"error": "forbidden"}


def test_operator_can_block_with_mocked_enforcement(app, operator_account, monkeypatch):
    client = app.test_client()
    token = csrf_token_for(client)
    assert login(client, OPERATOR_USERNAME, TEST_PASSWORD, token).status_code == 200

    calls = []

    def fake_block(ip):
        calls.append(ip)
        return {"ok": True, "platform": "linux", "message": "blocked"}

    monkeypatch.setattr(ips_mod, "block_ip", fake_block)
    response = client.post(
        "/api/block", json=BLOCK_PAYLOAD, headers={CSRF_HEADER: token}
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "blocked"
    assert calls == [BLOCK_PAYLOAD["ip"]]


def test_admin_can_create_user(app, admin_account):
    client = app.test_client()
    token = csrf_token_for(client)
    assert login(client, ADMIN_USERNAME, TEST_PASSWORD, token).status_code == 200

    response = client.post(
        "/api/auth/users",
        json={
            "username": "newoperator",
            "password": "AnotherLabPassw0rd!",
            "role": "operator",
        },
        headers={CSRF_HEADER: token},
    )
    assert response.status_code == 201
    assert response.get_json()["user"] == {
        "id": response.get_json()["user"]["id"],
        "username": "newoperator",
        "role": "operator",
    }

    users = client.get("/api/auth/users").get_json()["users"]
    assert any(user["username"] == "newoperator" and user["role"] == "operator" for user in users)


def test_audit_entry_written_without_secrets(app, admin_account):
    client = app.test_client()
    token = csrf_token_for(client)
    assert login(client, ADMIN_USERNAME, TEST_PASSWORD, token).status_code == 200

    response = client.post(
        "/api/auth/users",
        json={
            "username": "auditedviewer",
            "password": "AuditLabPassw0rd!",
            "role": "viewer",
        },
        headers={CSRF_HEADER: token},
    )
    assert response.status_code == 201

    with db_connection() as conn:
        rows = conn.execute("SELECT * FROM audit_log").fetchall()
    assert any(
        row["method"] == "POST"
        and row["path"] == "/api/auth/users"
        and row["status"] == 201
        and row["username"] == ADMIN_USERNAME
        and row["role"] == "admin"
        for row in rows
    )
    stored = " ".join(str(value) for row in rows for value in tuple(row))
    assert "AuditLabPassw0rd!" not in stored
    assert token not in stored


def test_no_password_hash_in_responses(app, admin_account):
    client = app.test_client()
    token = csrf_token_for(client)

    with db_connection() as conn:
        password_hash = conn.execute(
            "SELECT password_hash FROM users WHERE username = ?", (ADMIN_USERNAME,)
        ).fetchone()["password_hash"]
    assert password_hash.startswith("$argon2id$")

    login_text = login(client, ADMIN_USERNAME, TEST_PASSWORD, token).get_data(as_text=True)
    me_text = client.get("/api/auth/me").get_data(as_text=True)
    users_text = client.get("/api/auth/users").get_data(as_text=True)
    for text in (login_text, me_text, users_text):
        assert "password_hash" not in text
        assert password_hash not in text


def test_login_rate_limit_returns_generic_429(app, admin_account):
    client = app.test_client()
    token = csrf_token_for(client)

    statuses = [
        login(client, ADMIN_USERNAME, TEST_PASSWORD, token).status_code for _ in range(6)
    ]
    assert statuses == [200, 200, 200, 200, 200, 429]
    assert client.post(
        "/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": TEST_PASSWORD},
        headers={CSRF_HEADER: token},
    ).get_json() == {"error": "too many requests"}


def test_session_cookie_flags(app, admin_account):
    client = app.test_client()
    token = csrf_token_for(client)

    response = login(client, ADMIN_USERNAME, TEST_PASSWORD, token)
    session_cookie = next(
        value for value in response.headers.getlist("Set-Cookie")
        if value.startswith("session=")
    )
    assert "HttpOnly" in session_cookie
    assert "SameSite=Strict" in session_cookie
    assert "Secure" not in session_cookie
