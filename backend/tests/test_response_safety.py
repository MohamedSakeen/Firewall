"""Safe-by-default automated response: modes, gates, approvals and audit log."""

import json
import logging

import pytest

from api.routes import autonomy as autonomy_mod
from api.routes import ips as ips_mod
from api.routes import response as response_mod
from auth.db import SCHEMA_VERSION, db_connection, list_response_actions
from auth.db import record_response_action
from conftest import (
    ADMIN_USERNAME,
    CSRF_HEADER,
    OPERATOR_USERNAME,
    TEST_PASSWORD,
    csrf_token_for,
    login,
)
from engine.IPS.response_controller import (
    ResponseController,
    configure_autonomy_level,
    get_response_mode,
)
from engine.response.policy.autonomy_engine import AutonomyEngine, global_autonomy_engine
from engine.response.rollback_manager import ResponseRollbackManager, global_rollback_manager


@pytest.fixture(autouse=True)
def isolated_global_response_state(monkeypatch):
    """Keep global autonomy and rollback state from leaking between tests."""
    for attribute in (
        "current_level",
        "kill_switch_active",
        "kill_switch_timestamp",
        "kill_switch_reason",
    ):
        monkeypatch.setattr(
            global_autonomy_engine, attribute, getattr(global_autonomy_engine, attribute)
        )
    monkeypatch.setattr(global_rollback_manager, "active_actions", {})


@pytest.fixture
def response_env(monkeypatch, tmp_path):
    """Isolated database and unset response settings."""
    from auth.db import init_db

    monkeypatch.setenv("FIREWALL_DB_PATH", str(tmp_path / "responses.db"))
    for name in (
        "FIREWALL_RESPONSE_MODE",
        "FIREWALL_AUTONOMY_LEVEL",
        "FIREWALL_AUTO_BLOCK_MAX_PER_MINUTE",
        "FIREWALL_AUTO_BLOCK_PER_IP_PER_MINUTE",
    ):
        monkeypatch.delenv(name, raising=False)
    init_db()
    return tmp_path / "responses.db"


def _ok_enforcement(calls):
    def enforce(ip):
        calls.append(ip)
        return {"ok": True, "platform": "lab", "message": "blocked"}

    return enforce


def _controller(monkeypatch, calls, mode="auto", level="LEVEL_4_ADAPTIVE_DEFENSE", **kwargs):
    """Build a controller with all OS enforcement replaced by a recorder."""
    engine = AutonomyEngine(level)
    unblocked = []
    manager = ResponseRollbackManager(
        unblock_func=lambda ip: unblocked.append(ip) or {"ok": True, "message": "unblocked"}
    )
    controller = ResponseController(
        mode=mode,
        autonomy_engine=engine,
        configure_autonomy=False,
        rollback_manager=manager,
        enforce_block=_ok_enforcement(calls),
        **kwargs,
    )
    return controller, engine, unblocked


def test_shadow_is_default_and_never_enforces(response_env, monkeypatch):
    calls = []
    controller = ResponseController(
        autonomy_engine=AutonomyEngine(),
        configure_autonomy=False,
        rollback_manager=ResponseRollbackManager(unblock_func=lambda ip: None),
        enforce_block=lambda ip: calls.append(ip),
    )
    assert controller.mode == "shadow"
    assert get_response_mode() == "shadow"

    result = controller.process("192.0.2.10", "high")
    assert result["status"] == "PROPOSED"
    assert calls == []

    record = list_response_actions(1)[0]
    assert record["mode"] == "shadow"
    assert record["status"] == "PROPOSED"
    assert record["actor"] == "system"
    assert record["ip"] == "192.0.2.10"


def test_invalid_mode_and_rate_settings_fall_back(response_env, monkeypatch, caplog):
    monkeypatch.setenv("FIREWALL_RESPONSE_MODE", "not-a-mode")
    monkeypatch.setenv("FIREWALL_AUTONOMY_LEVEL", "LEVEL_99")
    monkeypatch.setenv("FIREWALL_AUTO_BLOCK_MAX_PER_MINUTE", "-3")
    monkeypatch.setenv("FIREWALL_AUTO_BLOCK_PER_IP_PER_MINUTE", "abc")

    fallback_engine = AutonomyEngine("LEVEL_4_ADAPTIVE_DEFENSE")
    with caplog.at_level(logging.WARNING):
        level = configure_autonomy_level(fallback_engine)
        controller = ResponseController(
            autonomy_engine=AutonomyEngine(),
            configure_autonomy=False,
            enforce_block=lambda ip: pytest.fail("no enforcement in fallback mode"),
        )
    assert level == "LEVEL_1_RECOMMEND"
    assert fallback_engine.current_level == "LEVEL_1_RECOMMEND"
    assert controller.mode == "shadow"
    assert controller.max_per_minute == 5
    assert controller.max_per_ip_per_minute == 1
    assert "Invalid" in caplog.text


def test_auto_mode_respects_autonomy_and_kill_switch(response_env, monkeypatch):
    calls = []
    controller, engine, _ = _controller(monkeypatch, calls, level="LEVEL_1_RECOMMEND")

    low_level = controller.process("192.0.2.41", "high")
    assert low_level["status"] == "IGNORED"
    assert "autonomy level" in low_level["reason"]
    assert calls == []

    engine.set_autonomy_level("LEVEL_3_CONTROLLED_AUTO")
    assert controller.process("192.0.2.42", "high")["status"] == "ENFORCED"
    assert calls == ["192.0.2.42"]

    # Quarantine is HIGH risk; LEVEL_3 permits LOW risk only.
    engine.set_autonomy_level("LEVEL_4_ADAPTIVE_DEFENSE")
    engine.trigger_kill_switch("lab emergency stop")
    stopped = controller.process("192.0.2.43", "critical")
    assert stopped["status"] == "IGNORED"
    assert "kill switch" in stopped["reason"].lower()
    assert calls == ["192.0.2.42"]


def test_allowlist_rejects_loopback_and_zero_prefix_config(
    response_env, monkeypatch, caplog
):
    calls = []
    controller, _, _ = _controller(monkeypatch, calls)

    loopback = controller.process("127.0.0.1", "high")
    assert loopback["status"] == "IGNORED"
    assert "allow-listed" in loopback["reason"]
    assert calls == []

    bad_config = response_env.parent / "whitelist.json"
    bad_config.write_text(json.dumps(["0.0.0.0/0"]), encoding="utf-8")
    with caplog.at_level(logging.ERROR):
        strict = ResponseController(
            mode="auto",
            autonomy_engine=AutonomyEngine("LEVEL_4_ADAPTIVE_DEFENSE"),
            configure_autonomy=False,
            whitelist_path=bad_config,
            enforce_block=lambda ip: calls.append(ip),
        )
    assert strict.allowlist_valid is False
    failed_closed = strict.process("192.0.2.44", "high")
    assert failed_closed["status"] == "IGNORED"
    assert calls == []
    assert "allow-list" in caplog.text.lower()


def test_rate_limits_stop_extra_blocks(response_env, monkeypatch):
    monkeypatch.setenv("FIREWALL_AUTO_BLOCK_MAX_PER_MINUTE", "2")
    monkeypatch.setenv("FIREWALL_AUTO_BLOCK_PER_IP_PER_MINUTE", "1")
    calls = []
    controller, _, _ = _controller(monkeypatch, calls)

    assert controller.process("192.0.2.51", "high")["status"] == "ENFORCED"
    limited = controller.process("192.0.2.51", "high")
    assert limited["status"] == "IGNORED"
    assert "per-IP" in limited["reason"]
    assert controller.process("192.0.2.52", "high")["status"] == "ENFORCED"
    global_limit = controller.process("192.0.2.53", "high")
    assert global_limit["status"] == "IGNORED"
    assert "global" in global_limit["reason"]
    assert calls == ["192.0.2.51", "192.0.2.52"]


def test_policy_maps_blocks_and_ignores_unsupported_actions(response_env, monkeypatch):
    calls = []
    controller, engine, _ = _controller(monkeypatch, calls)

    temporary = controller.process("192.0.2.61", "high")
    assert temporary["status"] == "ENFORCED"
    assert temporary["duration"] == 3600
    quarantine = controller.process("192.0.2.62", "critical")
    assert quarantine["status"] == "ENFORCED"
    assert quarantine["duration"] == 86400

    ignored = controller.process("192.0.2.63", "informational")
    assert ignored["status"] == "IGNORED"
    assert calls == ["192.0.2.61", "192.0.2.62"]
    assert any(
        row["ip"] == "192.0.2.63" and row["status"] == "IGNORED"
        for row in list_response_actions(50)
    )

    engine.set_autonomy_level("LEVEL_3_CONTROLLED_AUTO")
    high_risk = controller.process("192.0.2.64", "critical")
    assert high_risk["status"] == "IGNORED"
    assert "LOW-risk" in high_risk["reason"]
    assert calls == ["192.0.2.61", "192.0.2.62"]


def test_approval_mode_creates_pending_and_admin_approves_once(
    app, auth_client, monkeypatch
):
    calls = []
    controller, _, _ = _controller(monkeypatch, calls, mode="approval")
    monkeypatch.setattr(response_mod, "global_response_controller", controller)

    proposed = controller.process("192.0.2.71", "high")
    assert proposed["status"] == "PENDING_APPROVAL"
    assert calls == []

    pending = auth_client.get("/api/responses/approvals").get_json()["approvals"]
    assert [item["action_id"] for item in pending] == [proposed["action_id"]]

    approved = auth_client.post(
        f"/api/responses/approvals/{proposed['action_id']}/approve",
        json={"reason": "reviewed lab alert"},
    )
    assert approved.status_code == 200, approved.get_json()
    assert calls == ["192.0.2.71"]

    again = auth_client.post(
        f"/api/responses/approvals/{proposed['action_id']}/approve", json={}
    )
    assert again.status_code == 404
    assert calls == ["192.0.2.71"]

    actions = auth_client.get("/api/responses/actions").get_json()["actions"]
    approvals = [row for row in actions if row["action"] == "approve"]
    assert len(approvals) == 1
    assert approvals[0]["actor"] == ADMIN_USERNAME
    assert approvals[0]["reason"] == "reviewed lab alert"
    assert approvals[0]["status"] == "ENFORCED"


def test_approval_rechecks_kill_switch(app, auth_client, monkeypatch):
    calls = []
    controller, engine, _ = _controller(monkeypatch, calls, mode="approval")
    monkeypatch.setattr(response_mod, "global_response_controller", controller)
    proposed = controller.process("192.0.2.75", "high")

    engine.trigger_kill_switch("lab emergency stop")
    blocked = auth_client.post(
        f"/api/responses/approvals/{proposed['action_id']}/approve", json={}
    )
    assert blocked.status_code == 409
    assert calls == []
    assert controller.get_pending_action(proposed["action_id"]) is not None

    engine.reset_kill_switch()
    approved = auth_client.post(
        f"/api/responses/approvals/{proposed['action_id']}/approve", json={}
    )
    assert approved.status_code == 200
    assert calls == ["192.0.2.75"]


def test_approval_routes_are_admin_only_but_actions_are_readable(
    app, operator_account, monkeypatch
):
    client = app.test_client()
    token = csrf_token_for(client)
    assert login(client, OPERATOR_USERNAME, TEST_PASSWORD, token).status_code == 200

    assert client.get("/api/responses/approvals").status_code == 403
    assert client.post(
        "/api/responses/approvals/ACT-NOPE/approve", headers={CSRF_HEADER: token}
    ).status_code == 403
    assert client.get("/api/responses/actions").status_code == 200


def test_approval_rejection_is_logged(app, auth_client, monkeypatch):
    calls = []
    controller, _, _ = _controller(monkeypatch, calls, mode="approval")
    monkeypatch.setattr(response_mod, "global_response_controller", controller)
    proposed = controller.process("192.0.2.72", "high")

    rejected = auth_client.post(
        f"/api/responses/approvals/{proposed['action_id']}/reject",
        json={"reason": "insufficient evidence"},
    )
    assert rejected.status_code == 200
    assert calls == []
    assert auth_client.get("/api/responses/approvals").get_json()["approvals"] == []

    rejection = next(
        row for row in list_response_actions(50) if row["action"] == "reject"
    )
    assert rejection["actor"] == ADMIN_USERNAME
    assert rejection["reason"] == "insufficient evidence"
    assert rejection["status"] == "REJECTED"


def test_manual_block_and_unblock_record_actor_and_reason(
    app, auth_client, monkeypatch
):
    monkeypatch.setattr(
        ips_mod,
        "block_ip",
        lambda ip: {"ok": True, "platform": "lab", "message": "blocked"},
    )
    monkeypatch.setattr(
        ips_mod,
        "remove_block",
        lambda ip: {"ok": True, "platform": "lab", "message": "unblocked"},
    )
    monkeypatch.setattr(ips_mod.global_live_store, "record_block", lambda *a, **k: None)
    monkeypatch.setattr(ips_mod.global_live_store, "record_unblock", lambda ip: None)

    blocked = auth_client.post(
        "/api/block",
        json={
            "ip": "192.0.2.80",
            "reason": "  confirmed\nbrute-force  ",
            "duration": 60,
        },
    )
    assert blocked.status_code == 200, blocked.get_json()
    action_id = blocked.get_json()["action_id"]
    assert global_rollback_manager.active_actions[action_id]["status"] == "ACTIVE"

    unblocked = auth_client.post(
        "/api/unblock",
        json={"ip": "192.0.2.80", "reason": "false positive resolved"},
    )
    assert unblocked.status_code == 200, unblocked.get_json()
    assert global_rollback_manager.active_actions[action_id]["status"] == "ROLLED_BACK"

    rows = list_response_actions(50)
    block_row = next(row for row in rows if row["action"] == "block")
    unblock_row = next(row for row in rows if row["action"] == "unblock")
    assert block_row["actor"] == unblock_row["actor"] == ADMIN_USERNAME
    assert block_row["reason"] == "confirmed brute-force"
    assert block_row["status"] == "ENFORCED"
    assert block_row["details"]["duration"] == 60
    assert unblock_row["reason"] == "false positive resolved"
    assert unblock_row["status"] == "UNBLOCKED"
    assert action_id in unblock_row["details"]["rolled_back_actions"]


def test_kill_switch_blocks_manual_enforcement(app, auth_client, monkeypatch):
    calls = []
    monkeypatch.setattr(ips_mod, "block_ip", lambda ip: calls.append(ip))
    monkeypatch.setattr(global_autonomy_engine, "kill_switch_active", True)

    response = auth_client.post(
        "/api/block", json={"ip": "192.0.2.81", "reason": "lab test", "duration": 60}
    )
    assert response.status_code == 409
    assert calls == []
    assert not any(
        row["ip"] == "192.0.2.81" for row in list_response_actions(50)
    )


def test_rollback_removes_block_and_records_actor(app, auth_client, monkeypatch):
    unblocked = []
    manager = ResponseRollbackManager(
        unblock_func=lambda ip: unblocked.append(ip) or {"ok": True, "message": "unblocked"}
    )
    manager.register_action("ACT-TEST-1", "192.0.2.90", duration_seconds=600)
    monkeypatch.setattr(autonomy_mod, "global_rollback_manager", manager)

    response = auth_client.post(
        "/api/autonomy/rollback",
        json={"action_id": "ACT-TEST-1", "reason": "lab cleanup"},
    )
    assert response.status_code == 200, response.get_json()
    assert unblocked == ["192.0.2.90"]
    assert manager.active_actions["ACT-TEST-1"]["status"] == "ROLLED_BACK"

    row = next(record for record in list_response_actions(50) if record["action"] == "rollback")
    assert row["actor"] == ADMIN_USERNAME
    assert row["reason"] == "lab cleanup"
    assert row["status"] == "ROLLED_BACK"
    assert row["ip"] == "192.0.2.90"


def test_response_action_log_schema_and_redaction(response_env):
    with db_connection() as conn:
        assert conn.execute("PRAGMA user_version").fetchone()[0] == SCHEMA_VERSION
        assert conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'response_actions'"
        ).fetchone() is not None

    record_response_action(
        action_id="ACT-REDACT-1",
        actor="system",
        action="block",
        ip="192.0.2.99",
        reason="alert reviewed",
        mode="auto",
        status="PROPOSED",
        details={"csrf_token": "secret-csrf", "message": "Bearer abc123"},
    )
    row = list_response_actions(1)[0]
    serialized = json.dumps(row["details"])
    assert "secret-csrf" not in serialized
    assert "abc123" not in serialized
    assert row["details"]["csrf_token"] == "[REDACTED]"
    assert row["details"]["message"] == "Bearer [REDACTED]"
