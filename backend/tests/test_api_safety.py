import json

import pytest

from api import api as api_module
from api.api import get_allowed_origins, socketio
from api.routes import firewall as firewall_mod
from api.routes import ips as ips_mod
from api.routes import rules as rules_mod
from engine.IPS.ban_tracker import get_ban


def test_health_endpoint(app):
    response = app.test_client().get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_invalid_ip_rejected(auth_client, monkeypatch):
    def unexpected_block(ip):
        pytest.fail("enforcement must not run for invalid IPs")

    monkeypatch.setattr(ips_mod, "block_ip", unexpected_block)
    client = auth_client
    for value in ("192.168.1.0/24", "example.com", "", "  ", True, 12345):
        response = client.post(
            "/api/block", json={"ip": value, "reason": "test", "duration": 60}
        )
        assert response.status_code == 400
        response = client.post("/api/unblock", json={"ip": value})
        assert response.status_code == 400


def test_block_requires_valid_reason_and_duration(auth_client, monkeypatch):
    monkeypatch.setattr(ips_mod, "block_ip", lambda ip: pytest.fail("must not enforce"))
    client = auth_client
    cases = [
        {"ip": "192.0.2.10", "reason": "", "duration": 60},
        {"ip": "192.0.2.10", "reason": "x" * 201, "duration": 60},
        {"ip": "192.0.2.10", "reason": "test", "duration": 0},
        {"ip": "192.0.2.10", "reason": "test", "duration": 8 * 24 * 60 * 60},
        {"ip": "192.0.2.10", "reason": "test", "duration": True},
    ]
    for payload in cases:
        assert client.post("/api/block", json=payload).status_code == 400


def test_block_reports_enforcement_failure(auth_client, monkeypatch):
    monkeypatch.setattr(
        ips_mod,
        "block_ip",
        lambda ip: {"ok": False, "platform": "linux", "message": "iptables is not installed"},
    )
    response = auth_client.post(
        "/api/block", json={"ip": "192.0.2.11", "reason": "test", "duration": 60}
    )
    assert response.status_code >= 500
    assert response.get_json().get("error")
    assert get_ban("192.0.2.11") is None


def test_successful_block_uses_enforcement_result(auth_client, monkeypatch):
    monkeypatch.setattr(
        ips_mod,
        "block_ip",
        lambda ip: {"ok": True, "platform": "win32", "message": "blocked"},
    )
    response = auth_client.post(
        "/api/block", json={"ip": "192.0.2.12", "reason": "test", "duration": 60}
    )
    assert response.status_code == 200
    assert response.get_json()["status"] == "blocked"
    assert get_ban("192.0.2.12") is not None


def test_firewall_rules_validation_and_atomic_write(auth_client, monkeypatch, tmp_path):
    monkeypatch.setattr(firewall_mod, "BASE", tmp_path)
    client = auth_client
    assert client.post("/api/firewall/rules", json={"src": "example.com"}).status_code == 400
    assert client.post("/api/firewall/rules", json={"port": 70000}).status_code == 400
    assert client.post("/api/firewall/rules", json={"port": "abc"}).status_code == 400
    assert client.post("/api/firewall/rules", json={"unknown": "value"}).status_code == 400

    response = client.post(
        "/api/firewall/rules", json={"src": "10.10.0.0/16", "port": "443"}
    )
    assert response.status_code == 200
    saved = json.loads((tmp_path / "rules.json").read_text(encoding="utf-8"))
    assert "10.10.0.0/16" in saved["blocked_ips"]
    assert 443 in saved["blocked_ports"]
    assert sorted(tmp_path.glob(".rules.json.*.tmp")) == []


def test_rule_filename_traversal_rejected(app, auth_client, monkeypatch, tmp_path):
    monkeypatch.setattr(rules_mod, "BASE", tmp_path)
    names = [
        "../evil.json",
        "..\\evil.json",
        "../../evil.json",
        "subdir/evil.json",
        "/tmp/evil.json",
        "evil.txt",
        "evil.JSON",
    ]
    with app.test_request_context("/api/rules/firewall/rules.json", method="PUT", json={}):
        for name in names:
            response = rules_mod.save_rule("firewall", name)
            status = response[1] if isinstance(response, tuple) else response.status_code
            assert status == 400
    response = auth_client.put(
        "/api/rules/firewall/%2e%2e%2f%2e%2e%2fevil.json", json={}
    )
    assert response.status_code in (400, 404)


def test_unknown_rule_keys_rejected(auth_client, monkeypatch, tmp_path):
    rules_dir = tmp_path / "rules"
    firewall_dir = rules_dir / "firewall"
    firewall_dir.mkdir(parents=True)
    target = firewall_dir / "rules.json"
    original = {"blocked_ips": ["192.0.2.1"], "blocked_ports": [22]}
    target.write_text(json.dumps(original), encoding="utf-8")
    monkeypatch.setattr(rules_mod, "BASE", rules_dir)

    client = auth_client
    response = client.put(
        "/api/rules/firewall/rules.json",
        json={"blocked_ips": [], "blocked_ports": [], "injected": {"x": 1}},
    )
    assert response.status_code == 400
    assert json.loads(target.read_text(encoding="utf-8")) == original

    response = client.put(
        "/api/rules/firewall/rules.json",
        json={"blocked_ips": ["192.0.2.2"], "blocked_ports": [22]},
    )
    assert response.status_code == 200
    assert json.loads(target.read_text(encoding="utf-8"))["blocked_ips"] == ["192.0.2.2"]


def test_blocked_endpoint_cleans_expired_bans(auth_client, monkeypatch):
    cleaned = []
    monkeypatch.setattr(ips_mod, "cleanup_expired_bans", lambda: ["192.0.2.20"])
    monkeypatch.setattr(
        ips_mod.global_live_store,
        "record_unblock",
        lambda ip: cleaned.append(ip),
    )
    response = auth_client.get("/api/blocked")
    assert response.status_code == 200
    assert cleaned == ["192.0.2.20"]


def test_unblock_route_removes_ban_and_reports_enforcement(auth_client, monkeypatch):
    removed = []
    monkeypatch.setattr(
        ips_mod,
        "remove_block",
        lambda ip: removed.append(ip) or {"ok": True, "platform": "win32", "message": "unblocked"},
    )
    monkeypatch.setattr(ips_mod.global_live_store, "record_unblock", lambda ip: None)
    response = auth_client.post("/api/unblock", json={"ip": "192.0.2.21"})
    assert response.status_code == 200
    assert response.get_json()["enforcement"] == "os"
    assert removed == ["192.0.2.21"]


def test_cors_is_not_wildcard(app):
    origins = get_allowed_origins()
    assert origins and "*" not in origins
    assert "*" not in (socketio.server_options.get("cors_allowed_origins") or [])

    client = app.test_client()
    denied = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert denied.headers.get("Access-Control-Allow-Origin") != "*"
    assert denied.headers.get("Access-Control-Allow-Origin") != "http://evil.example"

    allowed = client.get("/api/health", headers={"Origin": origins[0]})
    assert allowed.headers.get("Access-Control-Allow-Origin") == origins[0]


def test_debug_is_off_and_bind_defaults_to_localhost(app, monkeypatch):
    assert app.debug is False
    calls = {}
    monkeypatch.setattr(api_module, "create_app", lambda: app)
    monkeypatch.setattr(api_module, "start_sniffer_if_enabled", lambda app=None: None)
    monkeypatch.setattr(api_module.socketio, "run", lambda app, **kwargs: calls.update(kwargs))
    monkeypatch.delenv("FIREWALL_HOST", raising=False)
    monkeypatch.delenv("FIREWALL_PORT", raising=False)
    api_module.run_server()
    assert calls["host"] == "127.0.0.1"
    assert calls["port"] == 5000
    assert calls["debug"] is False
    assert "allow_unsafe_werkzeug" not in calls


def test_sniffer_disabled_by_default(app, monkeypatch):
    called = []
    monkeypatch.setattr(api_module, "_run_sniffer", lambda: called.append(True))
    assert api_module.start_sniffer_if_enabled(app) is None
    assert called == []

    monkeypatch.setenv("FIREWALL_ENABLE_SNIFFER", "1")
    started = []

    class FakeThread:
        def __init__(self, target, **kwargs):
            self.target = target

        def start(self):
            started.append(self.target)

    monkeypatch.setattr(api_module.threading, "Thread", FakeThread)
    assert api_module.start_sniffer_if_enabled(app) is not None
    assert len(started) == 1


def test_secure_headers(app):
    client = app.test_client()
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "default-src" in response.headers["Content-Security-Policy"]
    assert "Strict-Transport-Security" not in response.headers

    secure = client.get("/api/health", base_url="https://localhost")
    assert "max-age" in secure.headers["Strict-Transport-Security"]
