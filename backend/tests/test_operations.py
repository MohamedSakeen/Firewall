"""Operations: redacted logging, metrics, health, alerts and log retention."""

import json
import logging
import os
from collections import OrderedDict

import pytest

import manage
from api import api as api_module
from api.routes import ips as ips_mod
from auth.db import SCHEMA_VERSION
from ops import alerts, metrics, retention
from ops.logging_config import RedactingFormatter, configure_logging


@pytest.fixture(autouse=True)
def ops_isolation(monkeypatch):
    """Keep global ops state and root logging handlers hermetic per test."""
    metrics.reset()
    monkeypatch.setattr(alerts, "_seen", OrderedDict())
    root = logging.getLogger()
    original_handlers = list(root.handlers)
    original_level = root.level
    yield
    metrics.reset()
    for handler in list(root.handlers):
        if getattr(handler, "_firewall_ops_handler", False):
            root.removeHandler(handler)
            handler.close()
    for handler in original_handlers:
        if handler not in root.handlers:
            root.addHandler(handler)
    root.setLevel(original_level)


def test_redacting_formatter_scrubs_sensitive_fields():
    formatter = RedactingFormatter()
    record = logging.LogRecord(
        "test",
        logging.WARNING,
        __file__,
        1,
        "request %s with Authorization: Bearer %s",
        ({"api_key": "key-secret-123", "password": "hunter2"}, "token-abc"),
        None,
    )
    record.session_cookie = "cookie-secret"

    text = formatter.format(record)
    payload = json.loads(text)
    assert payload["level"] == "WARNING"
    assert payload["message"].count("[REDACTED]") >= 3
    for secret in ("key-secret-123", "hunter2", "token-abc", "cookie-secret"):
        assert secret not in text
    assert payload["session_cookie"] == "[REDACTED]"

    embedded = logging.LogRecord(
        "test", logging.INFO, __file__, 2, "payload %s", ('{"password":"json-secret"}',), None
    )
    assert "json-secret" not in formatter.format(embedded)


def test_configure_logging_is_idempotent(tmp_path):
    log_dir = tmp_path / "logs"
    configure_logging(log_dir=log_dir)
    configure_logging(log_dir=log_dir)

    root = logging.getLogger()
    managed = [h for h in root.handlers if getattr(h, "_firewall_ops_handler", False)]
    assert len(managed) == 2
    assert {h._firewall_ops_kind for h in managed} == {"stderr", "file"}

    logging.getLogger("ops.test").info("login password=%s token=%s", "hunter2", "abc123")
    lines = (log_dir / "app.jsonl").read_text(encoding="utf-8").splitlines()
    assert "hunter2" not in lines[-1]
    assert "abc123" not in lines[-1]
    assert json.loads(lines[-1])["logger"] == "ops.test"


def test_metrics_endpoints_and_increments(auth_client):
    assert auth_client.get("/api/ops/metrics?format=bogus").status_code == 400
    assert auth_client.get("/api/ops/metrics").status_code == 200

    metrics.increment("packets", 3)
    metrics.increment("event_writes", 2)
    metrics.increment_http(200)
    metrics.set_gauge("sniffer_active", 1)

    data = auth_client.get("/api/ops/metrics").get_json()
    assert data["counters"]["packets"] == 3
    assert data["counters"]["event_writes"] == 2
    assert data["gauges"]["sniffer_active"] == 1
    assert data["http_requests_by_status_class"]["2xx"] >= 1

    expected_2xx = metrics.snapshot()["http_requests_by_status_class"]["2xx"]
    response = auth_client.get("/api/ops/metrics?format=prometheus")
    assert response.status_code == 200
    assert "text/plain" in response.content_type
    text = response.get_data(as_text=True)
    assert "firewall_packets_total 3" in text
    assert f'firewall_http_requests_total{{status_class="2xx"}} {expected_2xx}' in text
    assert "firewall_sniffer_active 1" in text


def test_ops_health_requires_auth(app):
    assert app.test_client().get("/api/ops/health").status_code == 401
    assert app.test_client().get("/api/ops/metrics").status_code == 401
    assert app.test_client().get("/api/health").get_json() == {"status": "ok"}


def test_ops_health_has_safe_fields(auth_client):
    data = auth_client.get("/api/ops/health").get_json()
    required = {
        "db_ok",
        "schema_version",
        "user_count",
        "event_count",
        "response_action_count",
        "sniffer_enabled",
        "response_mode",
        "autonomy_level",
        "kill_switch_active",
        "last_event_timestamp",
        "uptime_seconds",
        "recent_error_count",
    }
    assert required <= set(data)
    assert data["db_ok"] is True
    assert data["schema_version"] == SCHEMA_VERSION
    assert isinstance(data["user_count"], int)
    assert isinstance(data["kill_switch_active"], bool)
    assert isinstance(data["uptime_seconds"], (int, float))

    serialized = json.dumps(data)
    for marker in ("password", "192.0.2.", "backend/", "/tmp/"):
        assert marker not in serialized


def test_alert_queue_dedupes_and_redacts(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREWALL_LOG_DIR", str(tmp_path / "logs"))
    clock = [1000.0]
    monkeypatch.setattr(alerts, "_clock", lambda: clock[0])
    monkeypatch.delenv("FIREWALL_ALERT_WEBHOOK_URL", raising=False)

    detail = {"password": "hunter2", "note": "Bearer token-abc"}
    assert alerts.queue_alert("high", "IDS alert", detail) is True
    assert alerts.queue_alert("high", "IDS alert", detail) is False
    records = alerts.list_alerts(10)
    assert len(records) == 1
    assert records[0]["level"] == "high"

    text = (tmp_path / "logs" / "notifications.jsonl").read_text(encoding="utf-8")
    assert "hunter2" not in text
    assert "token-abc" not in text

    clock[0] += alerts.DEDUP_WINDOW_SECONDS + 1
    assert alerts.queue_alert("high", "IDS alert", detail) is True
    assert len(alerts.list_alerts(10)) == 2


class _FakeResponse:
    def read(self, amount=-1):
        return b"{}"

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


def test_webhook_is_loopback_only_and_never_follows_redirects(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREWALL_LOG_DIR", str(tmp_path / "logs"))
    calls = []
    monkeypatch.setattr(
        alerts,
        "_open_webhook",
        lambda request, timeout: calls.append((request.full_url, timeout)) or _FakeResponse(),
    )
    assert any(isinstance(h, alerts._NoRedirectHandler) for h in alerts._webhook_opener.handlers)

    monkeypatch.setenv("FIREWALL_ALERT_WEBHOOK_URL", "http://127.0.0.1:9999/hook")
    assert alerts.queue_alert("critical", "Loopback hook", "detail") is True
    assert calls == [("http://127.0.0.1:9999/hook", alerts.WEBHOOK_TIMEOUT_SECONDS)]

    for url in (
        "http://example.com/hook",
        "http://user:pass@127.0.0.1/hook",
        "ftp://127.0.0.1/hook",
        "http://[::2]/hook",
        "not-a-url",
    ):
        assert alerts.validate_webhook_url(url) is None
    assert alerts.validate_webhook_url("http://[::1]:8080/hook") == "::1"

    calls.clear()
    monkeypatch.setenv("FIREWALL_ALERT_WEBHOOK_URL", "http://example.com/hook")
    assert alerts.queue_alert("critical", "Rejected hook", "detail") is True
    assert calls == []


def test_webhook_failure_does_not_break_local_queue(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREWALL_LOG_DIR", str(tmp_path / "logs"))
    monkeypatch.setenv("FIREWALL_ALERT_WEBHOOK_URL", "http://localhost:9999/hook")

    def fail(request, timeout):
        raise OSError("webhook offline")

    monkeypatch.setattr(alerts, "_open_webhook", fail)
    assert alerts.queue_alert("error", "Webhook offline", "detail") is True
    assert alerts.list_alerts(5)[0]["title"] == "Webhook offline"


def test_enforcement_failure_records_metric_and_alert(auth_client, monkeypatch):
    monkeypatch.setattr(
        ips_mod,
        "block_ip",
        lambda ip: {"ok": False, "platform": "linux", "message": "iptables unavailable"},
    )
    response = auth_client.post(
        "/api/block",
        json={"ip": "192.0.2.231", "reason": "test", "duration": 60},
    )
    assert response.status_code == 503
    snapshot = metrics.snapshot()
    assert snapshot["counters"]["enforcement_failures"] == 1
    assert snapshot["http_requests_by_status_class"]["5xx"] == 1

    alert = alerts.list_alerts(5)[0]
    assert alert["title"] == "Enforcement failure"
    assert "192.0.2.231" not in json.dumps(alert)


def test_successful_block_and_unblock_increment_metrics(auth_client, monkeypatch):
    monkeypatch.setattr(
        ips_mod,
        "block_ip",
        lambda ip: {"ok": True, "platform": "win32", "message": "blocked"},
    )
    monkeypatch.setattr(
        ips_mod,
        "remove_block",
        lambda ip: {"ok": True, "platform": "win32", "message": "unblocked"},
    )
    metrics.reset()
    assert auth_client.post(
        "/api/block",
        json={"ip": "192.0.2.232", "reason": "test", "duration": 60},
    ).status_code == 200
    assert auth_client.post("/api/unblock", json={"ip": "192.0.2.232"}).status_code == 200
    counters = metrics.snapshot()["counters"]
    assert counters["blocks"] == 1
    assert counters["unblocks"] == 1


def test_log_retention_days_reads_env(monkeypatch):
    monkeypatch.delenv("FIREWALL_LOG_RETENTION_DAYS", raising=False)
    assert retention.get_log_retention_days() == 30
    monkeypatch.setenv("FIREWALL_LOG_RETENTION_DAYS", "7")
    assert retention.get_log_retention_days() == 7
    monkeypatch.setenv("FIREWALL_LOG_RETENTION_DAYS", "0")
    assert retention.get_log_retention_days() == 30


def test_prune_logs_cli_deletes_only_old_flat_files(monkeypatch, tmp_path, capsys):
    log_dir = tmp_path / "logs"
    log_dir.mkdir()
    monkeypatch.setenv("FIREWALL_LOG_DIR", str(log_dir))
    now = 1_700_000_000.0
    monkeypatch.setattr(retention, "_now", lambda: now)
    old = now - 10 * 24 * 60 * 60
    recent = now - 60

    old_jsonl = log_dir / "old.jsonl"
    old_log = log_dir / "old.log"
    fresh_log = log_dir / "fresh.log"
    keep_txt = log_dir / "keep.txt"
    for path in (old_jsonl, old_log, fresh_log, keep_txt):
        path.write_text("{}", encoding="utf-8")
    os.utime(old_jsonl, (old, old))
    os.utime(old_log, (old, old))
    os.utime(fresh_log, (recent, recent))
    os.utime(keep_txt, (old, old))

    nested_dir = log_dir / "nested"
    nested_dir.mkdir()
    nested_log = nested_dir / "nested.log"
    nested_log.write_text("{}", encoding="utf-8")
    os.utime(nested_log, (old, old))

    outside = tmp_path / "outside.log"
    outside.write_text("{}", encoding="utf-8")
    os.utime(outside, (old, old))
    symlink = log_dir / "link.log"
    symlink.symlink_to(outside)

    assert manage.main(["prune-logs", "--days", "0"]) == 2
    assert manage.main(["prune-logs", "--days", "7"]) == 0
    assert "Removed 2 log files older than 7 days" in capsys.readouterr().out
    assert not old_jsonl.exists()
    assert not old_log.exists()
    for survivor in (fresh_log, keep_txt, nested_log, symlink, outside):
        assert survivor.exists()


def test_startup_prunes_generated_logs(auth_env, monkeypatch):
    called = []
    monkeypatch.setattr(
        api_module, "prune_log_files", lambda log=None: called.append(log) or 0
    )
    application = api_module.create_app()
    assert application is not None
    assert len(called) == 1
