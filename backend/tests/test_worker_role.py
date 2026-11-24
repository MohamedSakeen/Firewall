"""Process role configuration and capture-only worker behavior."""

import pytest

import worker as worker_module
from api import api as api_module
from api.api import get_firewall_role


@pytest.fixture
def role_env(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREWALL_DB_PATH", str(tmp_path / "role.db"))
    monkeypatch.delenv("FIREWALL_ROLE", raising=False)
    monkeypatch.delenv("FIREWALL_ENABLE_SNIFFER", raising=False)
    monkeypatch.setattr(api_module, "_sniffer_thread", None)


class FakeThread:
    def __init__(self, target, **kwargs):
        self.target = target

    def start(self):
        pass


def test_role_defaults_and_validation(role_env, monkeypatch):
    assert get_firewall_role() == "all"
    for role in ("api", "worker", " API "):
        monkeypatch.setenv("FIREWALL_ROLE", role)
        expected = role.strip().lower()
        assert get_firewall_role() == expected
    monkeypatch.setenv("FIREWALL_ROLE", "unexpected")
    assert get_firewall_role() == "all"


def test_api_role_suppresses_sniffer_even_when_opted_in(role_env, monkeypatch):
    monkeypatch.setenv("FIREWALL_ROLE", "api")
    monkeypatch.setenv("FIREWALL_ENABLE_SNIFFER", "1")
    monkeypatch.setattr(
        api_module,
        "_run_sniffer",
        lambda: pytest.fail("api role must not capture"),
    )
    monkeypatch.setattr(
        api_module.threading,
        "Thread",
        lambda **kwargs: pytest.fail("api role must not start a thread"),
    )
    assert api_module.start_sniffer_if_enabled() is None


def test_worker_role_has_no_http_server(role_env, monkeypatch):
    monkeypatch.setenv("FIREWALL_ROLE", "worker")
    monkeypatch.setenv("FIREWALL_ENABLE_SNIFFER", "1")
    started = []
    monkeypatch.setattr(api_module, "_run_sniffer", lambda: None)

    class RecordingThread(FakeThread):
        def start(self):
            started.append(self)

    monkeypatch.setattr(api_module.threading, "Thread", RecordingThread)
    monkeypatch.setattr(api_module, "_wait_for_shutdown", lambda: None)
    monkeypatch.setattr(
        api_module,
        "create_app",
        lambda: pytest.fail("worker role must not create the HTTP app"),
    )
    monkeypatch.setattr(
        api_module.socketio,
        "run",
        lambda *args, **kwargs: pytest.fail("worker role must not bind a server"),
    )

    assert api_module.run_server() == 0
    assert len(started) == 1


def test_only_one_sniffer_thread_per_process(role_env, monkeypatch):
    monkeypatch.setenv("FIREWALL_ENABLE_SNIFFER", "1")
    monkeypatch.setattr(api_module, "_run_sniffer", lambda: None)
    started = []

    class RecordingThread(FakeThread):
        def start(self):
            started.append(self)

    monkeypatch.setattr(api_module.threading, "Thread", RecordingThread)
    first = api_module.start_sniffer_if_enabled()
    second = api_module.start_sniffer_if_enabled()
    assert first is second
    assert len(started) == 1


def test_capture_worker_respects_sniffer_opt_in(role_env, monkeypatch):
    monkeypatch.setenv("FIREWALL_ROLE", "worker")
    monkeypatch.setattr(api_module, "_wait_for_shutdown", lambda: None)
    assert api_module.run_worker() == 2
    assert api_module._sniffer_thread is None


def test_worker_entry_point_uses_capture_only(monkeypatch):
    calls = []
    monkeypatch.setattr(worker_module, "get_firewall_role", lambda: "worker")
    monkeypatch.setattr(worker_module, "run_worker", lambda: calls.append("run") or 7)
    assert worker_module.main() == 7
    assert calls == ["run"]

    monkeypatch.setattr(worker_module, "get_firewall_role", lambda: "api")
    assert worker_module.main() == 2
    assert calls == ["run"]
