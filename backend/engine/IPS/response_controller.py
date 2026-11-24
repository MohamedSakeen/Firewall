"""Single decision point for automated and approval-based IPS enforcement.

Nothing in the IDS/IPS alert path may call an OS firewall directly. This
controller decides whether a response is proposed, held for approval, or
actually enforced, and records every decision in the durable action log.
"""

import ipaddress
import json
import logging
import math
import os
import threading
import time
import uuid
from pathlib import Path

from auth.db import record_response_action, update_response_action, utc_now
from engine.IPS.ban_tracker import add_ban
from engine.IPS.block_manager import block_ip as default_enforce_block
from engine.IPS.response_policy import get_response_policy
from engine.response.policy.autonomy_engine import (
    AutonomyEngine,
    global_autonomy_engine,
)
from engine.response.rollback_manager import global_rollback_manager

logger = logging.getLogger(__name__)

RESPONSE_MODES = ("shadow", "dry-run", "approval", "auto")
DEFAULT_RESPONSE_MODE = "shadow"
DEFAULT_AUTONOMY_LEVEL = "LEVEL_1_RECOMMEND"
DEFAULT_MAX_PER_MINUTE = 5
DEFAULT_MAX_PER_IP_PER_MINUTE = 1
RATE_WINDOW_SECONDS = 60

ALLOWLIST_PATH = (
    Path(__file__).resolve().parent.parent / "rules" / "IPS" / "whitelist.json"
)

# The IPS policy file uses snake_case; the decision engine uses upper case.
# Both are mapped to a block with an explicit duration instead of being
# executed blindly under an unknown action name.
ACTION_ALIASES = {
    "block": ("block", 3600, "LOW"),
    "temporary_block": ("block", 3600, "LOW"),
    "quarantine": ("block", 86400, "HIGH"),
}


def get_response_mode():
    """Read FIREWALL_RESPONSE_MODE, falling back safely to shadow."""
    raw = os.getenv("FIREWALL_RESPONSE_MODE", DEFAULT_RESPONSE_MODE).strip().lower()
    if raw == "dry_run":
        raw = "dry-run"
    if raw not in RESPONSE_MODES:
        logger.warning(
            "Invalid FIREWALL_RESPONSE_MODE %r; using %s",
            raw,
            DEFAULT_RESPONSE_MODE,
        )
        return DEFAULT_RESPONSE_MODE
    return raw


def get_positive_int_env(name, default):
    """Read a strictly positive integer setting, falling back to default."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        logger.warning("Invalid %s; using %d", name, default)
        return default
    if value <= 0:
        logger.warning("%s must be a positive integer; using %d", name, default)
        return default
    return value


def configure_autonomy_level(engine=None):
    """Apply FIREWALL_AUTONOMY_LEVEL at startup or controller initialization."""
    engine = engine or global_autonomy_engine
    level = os.getenv("FIREWALL_AUTONOMY_LEVEL", "").strip() or DEFAULT_AUTONOMY_LEVEL
    if level not in AutonomyEngine.AUTONOMY_LEVELS:
        logger.warning(
            "Invalid FIREWALL_AUTONOMY_LEVEL %r; using %s",
            level,
            DEFAULT_AUTONOMY_LEVEL,
        )
        level = DEFAULT_AUTONOMY_LEVEL
    engine.set_autonomy_level(level)
    return level


def parse_allowlist(path=None):
    """Strictly parse IPs and CIDRs; reject /0 and any malformed entry."""
    target = Path(path) if path is not None else ALLOWLIST_PATH
    with target.open(encoding="utf-8") as handle:
        entries = json.load(handle)
    if not isinstance(entries, list):
        raise ValueError("allow-list must be a JSON list of IPs or CIDRs")

    networks = []
    for entry in entries:
        if not isinstance(entry, str) or not entry.strip():
            raise ValueError("allow-list entries must be non-empty strings")
        value = entry.strip()
        if "/" in value:
            network = ipaddress.ip_network(value, strict=False)
            if network.prefixlen == 0:
                raise ValueError("allow-list rejects /0 networks")
        else:
            address = ipaddress.ip_address(value)
            network = ipaddress.ip_network(f"{address}/{address.max_prefixlen}", strict=False)
        networks.append(network)
    return networks


class RateLimiter:
    """Sliding-window limits for automated enforcement attempts."""

    def __init__(self, max_per_minute, max_per_ip_per_minute, clock=None):
        self.max_per_minute = max_per_minute
        self.max_per_ip_per_minute = max_per_ip_per_minute
        self.clock = clock or time.monotonic
        self._global = []
        self._per_ip = {}
        self._lock = threading.Lock()

    def allows(self, ip):
        now = self.clock()
        cutoff = now - RATE_WINDOW_SECONDS
        with self._lock:
            self._global = [stamp for stamp in self._global if stamp > cutoff]
            stamps = [stamp for stamp in self._per_ip.get(ip, []) if stamp > cutoff]
            self._per_ip[ip] = stamps

            if len(self._global) >= self.max_per_minute:
                return False, "global auto-block rate limit reached"
            if len(stamps) >= self.max_per_ip_per_minute:
                return False, "per-IP auto-block rate limit reached"

            self._global.append(now)
            self._per_ip[ip].append(now)
            return True, "rate limits allow enforcement"


class ResponseController:
    """Apply response policy under a configured autonomy and safety envelope."""

    def __init__(
        self,
        mode=None,
        autonomy_engine=None,
        rollback_manager=None,
        whitelist_path=None,
        enforce_block=None,
        clock=None,
        max_per_minute=None,
        max_per_ip_per_minute=None,
        configure_autonomy=True,
    ):
        self.mode = get_response_mode() if mode is None else self._normalize_mode(mode)
        self.autonomy = autonomy_engine or global_autonomy_engine
        if configure_autonomy:
            configure_autonomy_level(self.autonomy)
        self.rollback_manager = rollback_manager or global_rollback_manager
        self.enforce_block = enforce_block or default_enforce_block
        self.max_per_minute = (
            get_positive_int_env("FIREWALL_AUTO_BLOCK_MAX_PER_MINUTE", DEFAULT_MAX_PER_MINUTE)
            if max_per_minute is None
            else max_per_minute
        )
        self.max_per_ip_per_minute = (
            get_positive_int_env(
                "FIREWALL_AUTO_BLOCK_PER_IP_PER_MINUTE", DEFAULT_MAX_PER_IP_PER_MINUTE
            )
            if max_per_ip_per_minute is None
            else max_per_ip_per_minute
        )
        self.limiter = RateLimiter(
            self.max_per_minute, self.max_per_ip_per_minute, clock=clock
        )
        self.pending_actions = {}
        self._pending_lock = threading.Lock()
        self.allowlist_path = whitelist_path or ALLOWLIST_PATH
        self.allowlist_valid = True
        try:
            self._allowlist = parse_allowlist(self.allowlist_path)
        except (OSError, ValueError) as exc:
            # Fail closed: an unreadable allow-list disables all enforcement.
            self.allowlist_valid = False
            self._allowlist = []
            logger.error(
                "Response allow-list %s is unusable (%s); automated enforcement disabled",
                self.allowlist_path,
                exc,
            )

    @staticmethod
    def _normalize_mode(mode):
        normalized = str(mode).strip().lower()
        if normalized == "dry_run":
            normalized = "dry-run"
        if normalized not in RESPONSE_MODES:
            logger.warning("Invalid response mode %r; using %s", mode, DEFAULT_RESPONSE_MODE)
            return DEFAULT_RESPONSE_MODE
        return normalized

    @staticmethod
    def _normalize_ip(value):
        if isinstance(value, bool) or not isinstance(value, str):
            return None
        try:
            return str(ipaddress.ip_address(value.strip()))
        except ValueError:
            return None

    @staticmethod
    def _resolve_action(policy):
        if not isinstance(policy, dict):
            policy = {}
        raw = str(policy.get("action") or "").strip().lower().replace("-", "_").replace(" ", "_")
        if raw in ACTION_ALIASES:
            kind, default_duration, risk = ACTION_ALIASES[raw]
            duration = policy.get("duration", default_duration)
            try:
                duration = float(duration)
            except (TypeError, ValueError, OverflowError):
                duration = default_duration
            if not math.isfinite(duration) or duration <= 0:
                duration = default_duration
            return kind, duration, risk, f"resolved {raw} as a block with duration {duration:g}s"

        return (
            "proposed",
            0,
            "LOW",
            f"unsupported action {raw or 'none'}; recorded for review only",
        )

    def is_allowlisted(self, ip):
        """Treat any allow-list/config problem as 'allow-listed' (fail closed)."""
        if not self.allowlist_valid:
            return True
        try:
            address = ipaddress.ip_address(ip)
        except ValueError:
            return True
        return any(address in network for network in self._allowlist)

    def _check_enforcement(self, ip, risk, require_autonomy=True):
        if self.autonomy.kill_switch_active:
            return False, "REJECTED: kill switch is engaged"
        if not self.allowlist_valid:
            return False, "REJECTED: allow-list configuration is invalid"
        if self.is_allowlisted(ip):
            return False, "REJECTED: source is allow-listed"
        if require_autonomy:
            allowed, message = self.autonomy.is_enforcement_allowed(risk)
            if not allowed:
                return False, message
        allowed, message = self.limiter.allows(ip)
        if not allowed:
            return False, f"REJECTED: {message}"
        return True, message

    def _record(self, **fields):
        try:
            return record_response_action(**fields)
        except Exception:
            logger.exception("could not record response action %s", fields.get("action_id"))
            return None

    def _update(self, action_id, **fields):
        try:
            return update_response_action(action_id, **fields)
        except Exception:
            logger.exception("could not update response action %s", action_id)
            return None

    def _apply_block(self, action_id, ip, duration, reason, mode, risk):
        try:
            result = self.enforce_block(ip)
        except Exception as exc:
            logger.exception("block enforcement raised an error for %s", ip)
            result = {"ok": False, "message": type(exc).__name__}
        if not isinstance(result, dict) or not result.get("ok"):
            message = (result or {}).get("message", "unknown enforcement error")
            self._update(action_id, status="FAILED", details={"enforcement_error": message})
            return False, message

        add_ban(ip, duration, reason)
        try:
            from api.services.live_store import global_live_store

            global_live_store.record_block(ip, reason, duration=duration, source=mode)
        except Exception:
            logger.exception("could not update live block state for %s", ip)

        self.rollback_manager.register_action(
            action_id,
            ip,
            action_type="QUARANTINE" if risk == "HIGH" else "TEMPORARY_BLOCK",
            duration_seconds=duration,
        )
        self._update(
            action_id,
            status="ENFORCED",
            details={
                "enforced": True,
                "platform": result.get("platform"),
                "rule": result.get("rule"),
                "duration": duration,
            },
        )
        return True, "block enforced"

    def process(self, src_ip, severity=None, reason=None, action=None, actor="system", policy=None):
        """Evaluate one alert; enforce only when the configured mode allows it."""
        ip = self._normalize_ip(src_ip)
        if ip is None:
            return {"status": "IGNORED", "reason": "invalid source IP", "ip": src_ip}

        if policy is None:
            if isinstance(action, dict):
                policy = action
            elif action is not None:
                policy = {"action": action}
            else:
                policy = get_response_policy(severity)

        kind, duration, risk, resolution = self._resolve_action(policy)
        action_id = f"RESP-{uuid.uuid4().hex[:12].upper()}"
        description = " ".join(str(reason or f"IPS alert severity {severity}").split())[:200]
        details = {
            "severity": severity,
            "requested_action": policy.get("action") if isinstance(policy, dict) else policy,
            "resolved_action": kind,
            "resolution": resolution,
            "duration": duration,
            "risk": risk,
            "actor": actor,
        }

        if kind != "block":
            self._record(
                action_id=action_id,
                actor=actor,
                action=str(policy.get("action") or "unknown"),
                ip=ip,
                reason=resolution,
                mode=self.mode,
                status="IGNORED",
                details=details,
            )
            return {
                "action_id": action_id,
                "status": "IGNORED",
                "reason": resolution,
                "ip": ip,
            }

        if self.mode in ("shadow", "dry-run"):
            self._record(
                action_id=action_id,
                actor=actor,
                action="block",
                ip=ip,
                reason=description,
                mode=self.mode,
                status="PROPOSED",
                details=details,
            )
            return {
                "action_id": action_id,
                "status": "PROPOSED",
                "reason": f"{self.mode} mode: no enforcement",
                "ip": ip,
            }

        if self.mode == "approval":
            pending = {
                "action_id": action_id,
                "ip": ip,
                "action": "block",
                "duration": duration,
                "severity": severity,
                "reason": description,
                "risk": risk,
                "mode": self.mode,
                "actor": actor,
                "created_at": utc_now(),
            }
            with self._pending_lock:
                self.pending_actions[action_id] = pending
            self._record(
                action_id=action_id,
                actor=actor,
                action="block",
                ip=ip,
                reason=description,
                mode=self.mode,
                status="PENDING_APPROVAL",
                details=details,
            )
            return {"action_id": action_id, "status": "PENDING_APPROVAL", "ip": ip}

        allowed, message = self._check_enforcement(ip, risk)
        if not allowed:
            self._record(
                action_id=action_id,
                actor=actor,
                action="block",
                ip=ip,
                reason=description,
                mode=self.mode,
                status="IGNORED",
                details={**details, "decision": message},
            )
            return {"action_id": action_id, "status": "IGNORED", "reason": message, "ip": ip}

        if self._record(
            action_id=action_id,
            actor=actor,
            action="block",
            ip=ip,
            reason=description,
            mode=self.mode,
            status="PROPOSED",
            details={**details, "decision": message},
        ) is None:
            logger.error("Refusing to enforce %s: durable action log is unavailable", action_id)
            return {
                "action_id": action_id,
                "status": "FAILED",
                "reason": "durable action log unavailable",
                "ip": ip,
            }

        enforced, outcome = self._apply_block(
            action_id, ip, duration, description, self.mode, risk
        )
        return {
            "action_id": action_id,
            "status": "ENFORCED" if enforced else "FAILED",
            "reason": outcome,
            "ip": ip,
            "duration": duration,
        }

    def list_pending_actions(self):
        with self._pending_lock:
            return [dict(item) for item in self.pending_actions.values()]

    def get_pending_action(self, action_id):
        with self._pending_lock:
            item = self.pending_actions.get(action_id)
            return dict(item) if item is not None else None

    def approve(self, action_id, actor, reason=None):
        """Enforce a pending action after re-checking the safety envelope."""
        pending = self.get_pending_action(action_id)
        if pending is None:
            return {"status": "NOT_FOUND", "action_id": action_id}

        approval_note = " ".join(str(reason or "administrator approval").split())[:200]
        allowed, message = self._check_enforcement(
            pending["ip"], pending["risk"], require_autonomy=False
        )
        if not allowed:
            self._record(
                action_id=f"{action_id}-APPROVE-FAILED",
                actor=actor,
                action="approve",
                ip=pending["ip"],
                reason=approval_note,
                mode="approval",
                status="FAILED",
                details={"decision": message},
            )
            return {"status": "REJECTED", "action_id": action_id, "reason": message}

        with self._pending_lock:
            self.pending_actions.pop(action_id, None)
        details = {
            "approved_by": actor,
            "approval_reason": approval_note,
            "duration": pending["duration"],
        }
        self._update(action_id, status="ENFORCED", details=details)
        self._record(
            action_id=f"{action_id}-APPROVED",
            actor=actor,
            action="approve",
            ip=pending["ip"],
            reason=approval_note,
            mode="approval",
            status="ENFORCED",
            details=details,
        )
        enforced, outcome = self._apply_block(
            action_id,
            pending["ip"],
            pending["duration"],
            pending["reason"],
            "approval",
            pending["risk"],
        )
        return {
            "action_id": action_id,
            "status": "ENFORCED" if enforced else "FAILED",
            "reason": outcome,
            "ip": pending["ip"],
        }

    def reject(self, action_id, actor, reason=None):
        """Reject and remove a pending action, recording the decision."""
        pending = self.get_pending_action(action_id)
        if pending is None:
            return {"status": "NOT_FOUND", "action_id": action_id}
        with self._pending_lock:
            self.pending_actions.pop(action_id, None)
        rejection_note = " ".join(str(reason or "administrator rejection").split())[:200]
        details = {"rejected_by": actor, "rejection_reason": rejection_note}
        self._update(action_id, status="REJECTED", details=details)
        self._record(
            action_id=f"{action_id}-REJECTED",
            actor=actor,
            action="reject",
            ip=pending["ip"],
            reason=rejection_note,
            mode="approval",
            status="REJECTED",
            details=details,
        )
        return {"status": "REJECTED", "action_id": action_id, "ip": pending["ip"]}


global_response_controller = ResponseController()
