"""Durable event storage: schema, CRUD, filtering, retention, and redaction."""

import json
from datetime import datetime, timedelta, timezone

import pytest

from auth.db import SCHEMA_VERSION, db_connection, init_db
from storage import events as event_store
from storage.events import (
    event_count,
    event_counts_by_type,
    get_retention_days,
    list_events,
    prune_events,
    record_event,
)


@pytest.fixture
def event_env(monkeypatch, tmp_path):
    """Use an isolated database with the current schema."""
    monkeypatch.setenv("FIREWALL_DB_PATH", str(tmp_path / "events.db"))
    monkeypatch.delenv("FIREWALL_EVENT_RETENTION_DAYS", raising=False)
    init_db()
    return tmp_path / "events.db"


def test_schema_version_and_event_indexes(event_env):
    with db_connection() as conn:
        version = conn.execute("PRAGMA user_version").fetchone()[0]
        indexes = {
            row[0]
            for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'index'")
        }
    assert version == SCHEMA_VERSION
    assert {"idx_events_timestamp", "idx_events_type_timestamp"} <= indexes


def test_record_and_list_events(event_env):
    first_id = record_event("packet", {
        "src_ip": "192.0.2.10",
        "dst_ip": "192.0.2.20",
        "protocol": "TCP",
        "size": 64,
    })
    second_id = record_event("alert", {
        "src_ip": "192.0.2.10",
        "attack": "Port Scan",
        "severity": "HIGH",
    })
    assert first_id == 1
    assert second_id == 2

    events = list_events(10)
    assert [event["event_type"] for event in events] == ["alert", "packet"]
    assert events[0]["details"]["attack"] == "Port Scan"
    assert events[1]["source_ip"] == "192.0.2.10"
    assert events[1]["details"]["size"] == 64


def test_list_events_filters_by_type_and_since(event_env, monkeypatch):
    times = iter(["2026-01-01T00:00:00+00:00", "2026-02-01T00:00:00+00:00"])
    monkeypatch.setattr(event_store, "utc_now", lambda: next(times))
    record_event("packet", {"src_ip": "192.0.2.1"})
    record_event("incident", {"ip": "192.0.2.2"})

    assert [e["event_type"] for e in list_events(10, event_type="packet")] == ["packet"]
    assert [e["event_type"] for e in list_events(10, since="2026-02-01T00:00:00Z")] == ["incident"]
    assert list_events(10, event_type="block") == []


def test_event_counts(event_env):
    record_event("packet", {"src_ip": "192.0.2.1"})
    record_event("packet", {"src_ip": "192.0.2.2"})
    record_event("alert", {"src_ip": "192.0.2.3"})

    assert event_count() == 3
    assert event_count("packet") == 2
    assert event_count("security_event") == 0
    assert event_counts_by_type() == {"alert": 1, "packet": 2}


def test_prune_events_removes_only_expired_rows(event_env):
    old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(timespec="seconds")
    recent = datetime.now(timezone.utc).isoformat(timespec="seconds")
    rows = [
        (old, "packet", "192.0.2.1", json.dumps({"old": True})),
        (recent, "alert", "192.0.2.2", json.dumps({"recent": True})),
    ]
    with db_connection() as conn:
        conn.executemany(
            "INSERT INTO events (timestamp, event_type, source_ip, details) "
            "VALUES (?, ?, ?, ?)",
            rows,
        )

    assert prune_events(days=7) == 1
    remaining = list_events(10)
    assert len(remaining) == 1
    assert remaining[0]["details"] == {"recent": True}


def test_retention_days_env_fallback(monkeypatch):
    monkeypatch.delenv("FIREWALL_EVENT_RETENTION_DAYS", raising=False)
    assert get_retention_days() == 30
    monkeypatch.setenv("FIREWALL_EVENT_RETENTION_DAYS", "7")
    assert get_retention_days() == 7
    monkeypatch.setenv("FIREWALL_EVENT_RETENTION_DAYS", "bad")
    assert get_retention_days() == 30
    monkeypatch.setenv("FIREWALL_EVENT_RETENTION_DAYS", "-1")
    assert get_retention_days() == 30


def test_allow_list_and_argument_validation(event_env):
    with pytest.raises(ValueError):
        record_event("drop", {"src_ip": "192.0.2.1"})
    with pytest.raises(ValueError):
        record_event(None, {})
    with pytest.raises(ValueError):
        list_events(0)
    with pytest.raises(ValueError):
        list_events(10, event_type="unknown")
    with pytest.raises(ValueError):
        event_count("unknown")
    with pytest.raises(ValueError):
        prune_events(0)


def test_payload_redaction_never_persists_secrets(event_env):
    record_event("security_event", {
        "src_ip": "192.0.2.50",
        "password": "hunter2",
        "api_token": "abc123",
        "authorization": "Bearer xyz789",
        "message": "Bearer xyz789",
        "nested": {"secret_key": "do-not-store", "note": "ok to keep"},
    })

    details = list_events(1)[0]["details"]
    serialized = json.dumps(details)
    assert details["nested"]["note"] == "ok to keep"
    assert details["password"] == "[REDACTED]"
    assert details["authorization"] == "[REDACTED]"
    assert details["message"] == "Bearer [REDACTED]"
    for secret in ("hunter2", "abc123", "xyz789", "do-not-store"):
        assert secret not in serialized


def test_record_event_initializes_schema_on_demand(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREWALL_DB_PATH", str(tmp_path / "fresh.db"))
    record_event("block", {"ip": "192.0.2.99"})
    assert event_count("block") == 1
