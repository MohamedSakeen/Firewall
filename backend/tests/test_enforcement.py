from types import SimpleNamespace

import pytest

from engine.IPS import block_manager, unblock_manager
from engine.IPS.ban_tracker import add_ban, get_ban, remove_ban
from engine.firewall import blocker


@pytest.fixture(autouse=True)
def clean_enforcement_state():
    blocker.BLOCKED_IPS.clear()
    yield
    blocker.BLOCKED_IPS.clear()


@pytest.fixture
def runner_calls(monkeypatch):
    calls = []

    def fake_run(args, **kwargs):
        calls.append((args, kwargs))
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(blocker.subprocess, "run", fake_run)
    monkeypatch.setattr(blocker, "log_block", lambda ip: None)
    monkeypatch.setattr(blocker, "log_unblock", lambda ip: None)
    return calls


def test_windows_block_uses_argument_array(runner_calls, monkeypatch):
    monkeypatch.setattr(blocker.sys, "platform", "win32")
    result = blocker.block_ip("192.0.2.10")
    assert result["ok"] is True
    assert result["platform"] == "win32"

    args, kwargs = runner_calls[0]
    assert isinstance(args, list)
    assert args[:5] == ["netsh", "advfirewall", "firewall", "add", "rule"]
    assert "name=Block_192.0.2.10" in args
    assert "remoteip=192.0.2.10" in args
    assert kwargs["shell"] is False
    assert kwargs["capture_output"] is True
    assert kwargs["timeout"] > 0
    assert "192.0.2.10" in blocker.BLOCKED_IPS


def test_block_manager_uses_argument_array(runner_calls, monkeypatch):
    monkeypatch.setattr(blocker.sys, "platform", "win32")
    result = block_manager.block_ip("192.0.2.11")
    assert result["ok"] is True
    args, kwargs = runner_calls[-1]
    assert isinstance(args, list)
    assert args[0] == "netsh"
    assert kwargs.get("shell") is False
    assert all(kwargs.get("shell") is not True for _, kwargs in runner_calls)


def test_unblock_removes_os_rule(runner_calls, monkeypatch):
    monkeypatch.setattr(blocker.sys, "platform", "win32")
    assert blocker.block_ip("192.0.2.12")["ok"] is True
    previous_calls = len(runner_calls)

    result = blocker.unblock_ip("192.0.2.12")
    assert result["ok"] is True
    args, kwargs = runner_calls[previous_calls]
    assert isinstance(args, list)
    assert args[:5] == ["netsh", "advfirewall", "firewall", "delete", "rule"]
    assert "name=Block_192.0.2.12" in args
    assert kwargs["shell"] is False
    assert "192.0.2.12" not in blocker.BLOCKED_IPS


def test_unsupported_platform_returns_failure(runner_calls, monkeypatch):
    monkeypatch.setattr(blocker.sys, "platform", "darwin")
    result = blocker.block_ip("192.0.2.13")
    assert result["ok"] is False
    assert result["platform"] == "darwin"
    assert runner_calls == []
    assert "192.0.2.13" not in blocker.BLOCKED_IPS


def test_invalid_ip_never_runs_os_command(runner_calls, monkeypatch):
    monkeypatch.setattr(blocker.sys, "platform", "win32")
    for value in ("192.0.2.0/24", "host.example", "", True, None):
        assert blocker.block_ip(value)["ok"] is False
        assert blocker.unblock_ip(value)["ok"] is False
    assert runner_calls == []


def test_linux_requires_iptables_and_privileges(runner_calls, monkeypatch):
    monkeypatch.setattr(blocker.sys, "platform", "linux")
    monkeypatch.setattr(blocker.shutil, "which", lambda command: None)
    denied = blocker.block_ip("192.0.2.14")
    assert denied["ok"] is False
    assert "iptables" in denied["message"]
    assert runner_calls == []

    monkeypatch.setattr(blocker.shutil, "which", lambda command: "/sbin/iptables")
    monkeypatch.setattr(blocker.os, "geteuid", lambda: 1000)
    denied = blocker.block_ip("192.0.2.14")
    assert denied["ok"] is False
    assert "root" in denied["message"].lower()
    assert runner_calls == []


def test_linux_uses_iptables_argument_array(runner_calls, monkeypatch):
    monkeypatch.setattr(blocker.sys, "platform", "linux")
    monkeypatch.setattr(blocker.shutil, "which", lambda command: "/sbin/iptables")
    monkeypatch.setattr(blocker.os, "geteuid", lambda: 0)
    result = blocker.block_ip("192.0.2.15")
    assert result["ok"] is True
    args, kwargs = runner_calls[0]
    assert args == ["iptables", "-I", "INPUT", "-s", "192.0.2.15", "-j", "DROP"]
    assert kwargs["shell"] is False

    result = blocker.unblock_ip("192.0.2.15")
    assert result["ok"] is True
    args, kwargs = runner_calls[-1]
    assert args == ["iptables", "-D", "INPUT", "-s", "192.0.2.15", "-j", "DROP"]
    assert kwargs["shell"] is False


def test_command_failure_does_not_record_block(monkeypatch):
    def failing_run(args, **kwargs):
        return SimpleNamespace(returncode=1, stdout="", stderr="permission denied")

    monkeypatch.setattr(blocker.subprocess, "run", failing_run)
    monkeypatch.setattr(blocker.sys, "platform", "win32")
    monkeypatch.setattr(blocker, "log_block", lambda ip: pytest.fail("must not log a failed block"))
    result = blocker.block_ip("192.0.2.16")
    assert result["ok"] is False
    assert result["enforced"] is False
    assert "192.0.2.16" not in blocker.BLOCKED_IPS


def test_expired_bans_are_cleaned(monkeypatch):
    ip = "192.0.2.17"
    remove_ban(ip)
    add_ban(ip, 1, "expired test")
    ban = get_ban(ip)
    monkeypatch.setattr(
        unblock_manager,
        "remove_os_rule",
        lambda address: {"ok": True, "platform": "linux", "message": "unblocked"},
    )
    expired = unblock_manager.cleanup_expired_bans(now=ban["start_time"] + 5)
    assert expired == [ip]
    assert get_ban(ip) is None


def test_unblock_clears_ban_even_when_os_fails(monkeypatch):
    ip = "192.0.2.18"
    remove_ban(ip)
    add_ban(ip, 60, "test")
    monkeypatch.setattr(
        unblock_manager,
        "remove_os_rule",
        lambda address: {"ok": False, "platform": "linux", "message": "iptables is not installed"},
    )
    result = unblock_manager.unblock_ip(ip)
    assert result["ok"] is False
    assert get_ban(ip) is None
