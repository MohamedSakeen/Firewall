"""Maintenance CLI: SQLite backup, event pruning, and safe reporting."""

import os
import sqlite3
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

import manage
from auth.db import db_connection, init_db
from auth.store import create_user
from storage.events import record_event


@pytest.fixture
def cli_env(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREWALL_DB_PATH", str(tmp_path / "firewall.db"))
    monkeypatch.delenv("FIREWALL_EVENT_RETENTION_DAYS", raising=False)
    init_db()
    return tmp_path / "firewall.db"


def test_backup_db_uses_sqlite_backup_api(cli_env, tmp_path, monkeypatch):
    def no_os_commands(*args, **kwargs):
        pytest.fail("maintenance commands must not invoke OS commands")

    monkeypatch.setattr(subprocess, "run", no_os_commands)
    monkeypatch.setattr(os, "system", no_os_commands)
    create_user("cliadmin", "LabTestPassw0rd!", "admin")
    record_event("alert", {"src_ip": "192.0.2.5"})

    output = tmp_path / "backup.db"
    assert manage.main(["backup-db", "--output", str(output)]) == 0
    assert output.is_file()
    if os.name == "posix":
        assert output.stat().st_mode & 0o777 == 0o600

    with sqlite3.connect(str(output)) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 1
        assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"


def test_backup_db_rejects_unsafe_paths(cli_env, tmp_path):
    outside = Path.cwd().parent / "firewall-escape-test.db"
    assert not outside.exists()
    assert manage.main(["backup-db", "--output", "../firewall-escape-test.db"]) == 2
    assert not outside.exists()

    symlink = tmp_path / "link.db"
    symlink.symlink_to(tmp_path / "target.db")
    assert manage.main(["backup-db", "--output", str(symlink)]) == 2
    assert manage.main(["backup-db", "--output", str(tmp_path / "backup.txt")]) == 2


def test_prune_events_cli(cli_env):
    old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(timespec="seconds")
    with db_connection() as conn:
        conn.execute(
            "INSERT INTO events (timestamp, event_type, source_ip, details) "
            "VALUES (?, ?, ?, ?)",
            (old, "packet", "192.0.2.1", '{"old": true}'),
        )

    assert manage.main(["prune-events", "--days", "0"]) == 2
    assert manage.main(["prune-events", "--days", "1"]) == 0
    with db_connection() as conn:
        assert conn.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 0


def test_stats_cli_reports_counts_without_secrets(cli_env, capsys):
    create_user("cliadmin", "LabTestPassw0rd!", "admin")
    record_event("packet", {"src_ip": "192.0.2.1"})
    record_event("packet", {"src_ip": "192.0.2.2"})
    record_event("alert", {"src_ip": "192.0.2.3"})

    assert manage.main(["stats"]) == 0
    output = capsys.readouterr().out
    assert "Users: 1" in output
    assert "packet: 2" in output
    assert "alert: 1" in output
    assert "LabTestPassw0rd!" not in output
    assert "password_hash" not in output
