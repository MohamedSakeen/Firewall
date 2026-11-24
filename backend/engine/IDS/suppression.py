"""Detection-only suppression allow-list.

Suppression filters IDS alerts; it does not authenticate users or grant access
to any resource.  A suppressed detection is recorded in a small in-memory log
with a machine-readable reason so operators can see what was filtered.
"""

from __future__ import annotations

import ipaddress
import json
import threading
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from time import time

from engine.rules.validator import RULE_ID_PATTERN

DEFAULT_SUPPRESSION_FILE = Path(__file__).resolve().parents[1] / "rules" / "IDS" / "suppression.json"
CONFIG_FIELDS = frozenset({"version", "source_ips", "rule_ids"})
MAX_SUPPRESSION_EVENTS = 200

SOURCE_IP_REASON = "source_ip_allowlisted"
RULE_ID_REASON = "rule_id_suppressed"
SUPPRESSION_REASONS = frozenset({SOURCE_IP_REASON, RULE_ID_REASON})

_events = deque(maxlen=MAX_SUPPRESSION_EVENTS)
_events_lock = threading.RLock()


class SuppressionConfigError(ValueError):
    """Raised when the suppression allow-list is malformed."""


@dataclass(frozen=True)
class SuppressionDecision:
    reason: str
    match: str


@dataclass(frozen=True)
class SuppressionConfig:
    source_networks: tuple
    rule_ids: frozenset

    def decide(self, src_ip, rule_id):
        """Return the first matching suppression reason, or None."""
        if src_ip:
            try:
                address = ipaddress.ip_address(str(src_ip))
            except ValueError:
                address = None
            if address is not None:
                for network in self.source_networks:
                    if address in network:
                        return SuppressionDecision(SOURCE_IP_REASON, "source_ip")

        if rule_id in self.rule_ids:
            return SuppressionDecision(RULE_ID_REASON, "rule_id")
        return None


def parse_suppression_config(data, source="<suppression>"):
    """Parse and validate suppression data using an allow-list of fields."""
    if not isinstance(data, dict):
        raise SuppressionConfigError(f"{source}: config must be a JSON object")
    unknown = sorted(set(data) - CONFIG_FIELDS)
    if unknown:
        raise SuppressionConfigError(f"{source}: unknown fields are not allowed: {', '.join(unknown)}")
    if data.get("version") != 1:
        raise SuppressionConfigError(f"{source}: field 'version' must be 1")

    source_ips = data.get("source_ips", [])
    rule_ids = data.get("rule_ids", [])
    if not isinstance(source_ips, list) or not isinstance(rule_ids, list):
        raise SuppressionConfigError(f"{source}: 'source_ips' and 'rule_ids' must be lists")
    if len(source_ips) > 100 or len(rule_ids) > 100:
        raise SuppressionConfigError(f"{source}: allow-lists are limited to 100 entries each")

    networks = []
    for index, item in enumerate(source_ips):
        if not isinstance(item, str) or not item.strip():
            raise SuppressionConfigError(f"{source}.source_ips[{index}]: expected an IP or CIDR string")
        try:
            network = ipaddress.ip_network(item.strip(), strict=False)
        except ValueError as exc:
            raise SuppressionConfigError(
                f"{source}.source_ips[{index}]: invalid IP or CIDR '{item}': {exc}"
            ) from exc
        if network.prefixlen == 0:
            raise SuppressionConfigError(
                f"{source}.source_ips[{index}]: a /0 allow-list would suppress every source"
            )
        networks.append(network)

    ids = set()
    for index, item in enumerate(rule_ids):
        if not isinstance(item, str) or not RULE_ID_PATTERN.fullmatch(item):
            raise SuppressionConfigError(f"{source}.rule_ids[{index}]: invalid rule id '{item}'")
        ids.add(item)

    return SuppressionConfig(source_networks=tuple(networks), rule_ids=frozenset(ids))


def load_suppression_config(path=None):
    """Load the allow-list; a missing file means no suppression."""
    config_path = Path(path) if path is not None else DEFAULT_SUPPRESSION_FILE
    if not config_path.exists():
        return SuppressionConfig(source_networks=(), rule_ids=frozenset())
    try:
        with config_path.open(encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError as exc:
        raise SuppressionConfigError(f"{config_path}: invalid JSON: {exc}") from exc
    except OSError as exc:
        raise SuppressionConfigError(f"{config_path}: cannot read config: {exc}") from exc
    return parse_suppression_config(data, source=str(config_path))


def record_suppression_event(src_ip, rule_id, detector, reason):
    """Remember a filtered detection for operator visibility."""
    if reason not in SUPPRESSION_REASONS:
        raise ValueError(f"unknown suppression reason: {reason}")
    entry = {
        "timestamp": time(),
        "src_ip": src_ip,
        "rule_id": rule_id,
        "detector": detector,
        "reason": reason,
        "suppressed": True,
    }
    with _events_lock:
        _events.append(entry)
    return dict(entry)


def suppression_snapshot(limit=100):
    """Return the most recent suppression events, newest last."""
    count = max(0, int(limit))
    with _events_lock:
        if count == 0:
            return []
        return [dict(event) for event in list(_events)[-count:]]


def clear_suppression_events():
    """Test helper: forget all recorded suppression events."""
    with _events_lock:
        _events.clear()
