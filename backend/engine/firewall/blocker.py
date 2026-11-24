import ipaddress
import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
BLOCKED_IPS = set()
RULE_PREFIX = "Block_"
COMMAND_TIMEOUT = 15

logger = logging.getLogger(__name__)


def normalize_ip(value):
    if isinstance(value, bool) or not isinstance(value, str):
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


def rule_name(ip):
    return f"{RULE_PREFIX}{ip}"


def _result(ok, message, platform=None, **extra):
    result = {
        "ok": bool(ok),
        "platform": platform if platform is not None else sys.platform,
        "message": message,
    }
    result.update(extra)
    return result


def _run(args, runner):
    try:
        return runner(
            args,
            shell=False,
            timeout=COMMAND_TIMEOUT,
            capture_output=True,
            text=True,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        logger.warning("firewall command failed: %s", type(exc).__name__)
        return None


def _succeeded(completed, operation):
    if completed is None:
        return False
    code = getattr(completed, "returncode", None)
    if code != 0:
        logger.warning("%s failed with exit code %s", operation, code)
        return False
    return True


def _linux_enforcement_available():
    if shutil.which("iptables") is None:
        return False, "iptables is not installed"
    if hasattr(os, "geteuid") and os.geteuid() != 0:
        return False, "iptables changes require root privileges"
    return True, ""


def log_block(ip):
    with (LOG_DIR / "blocked.log").open("a", encoding="utf-8") as f:
        f.write(f"{datetime.now()} - Blocked IP: {ip}\n")


def log_unblock(ip):
    with (LOG_DIR / "blocked.log").open("a", encoding="utf-8") as f:
        f.write(f"{datetime.now()} - Unblocked IP: {ip}\n")


def block_ip(ip, runner=None):
    runner = runner if runner is not None else subprocess.run
    address = normalize_ip(ip)
    if not address:
        return _result(False, "invalid IP address")

    if address in BLOCKED_IPS:
        return _result(True, "already blocked", enforced=True, rule=rule_name(address))

    platform = sys.platform
    if platform == "win32":
        args = [
            "netsh", "advfirewall", "firewall", "add", "rule",
            f"name={rule_name(address)}", "dir=in", "action=block",
            f"remoteip={address}",
        ]
        if not _succeeded(_run(args, runner), "netsh add rule"):
            return _result(False, "OS firewall rule could not be added", platform, enforced=False)
    elif platform.startswith("linux"):
        available, reason = _linux_enforcement_available()
        if not available:
            return _result(False, reason, platform, enforced=False)
        args = ["iptables", "-I", "INPUT", "-s", address, "-j", "DROP"]
        if not _succeeded(_run(args, runner), "iptables add rule"):
            return _result(False, "OS firewall rule could not be added", platform, enforced=False)
    else:
        return _result(
            False,
            f"automatic blocking is not supported on {platform}",
            platform,
            enforced=False,
        )

    BLOCKED_IPS.add(address)
    try:
        log_block(address)
    except OSError:
        logger.warning("could not write block log")
    return _result(True, "blocked", platform, enforced=True, rule=rule_name(address))


def unblock_ip(ip, runner=None):
    runner = runner if runner is not None else subprocess.run
    address = normalize_ip(ip)
    if not address:
        return _result(False, "invalid IP address")

    BLOCKED_IPS.discard(address)
    platform = sys.platform
    if platform == "win32":
        args = [
            "netsh", "advfirewall", "firewall", "delete", "rule",
            f"name={rule_name(address)}",
        ]
        if not _succeeded(_run(args, runner), "netsh delete rule"):
            return _result(False, "OS firewall rule could not be removed", platform, state_removed=True)
    elif platform.startswith("linux"):
        available, reason = _linux_enforcement_available()
        if not available:
            return _result(False, reason, platform, state_removed=True)
        args = ["iptables", "-D", "INPUT", "-s", address, "-j", "DROP"]
        if not _succeeded(_run(args, runner), "iptables delete rule"):
            return _result(False, "OS firewall rule could not be removed", platform, state_removed=True)
    else:
        return _result(
            False,
            f"automatic unblocking is not supported on {platform}",
            platform,
            state_removed=True,
        )

    try:
        log_unblock(address)
    except OSError:
        logger.warning("could not write unblock log")
    return _result(True, "unblocked", platform, state_removed=True, rule=rule_name(address))
