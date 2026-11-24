"""Rule-driven IDS pipeline with explainable, suppressible alerts.

Only detectors implemented below produce alerts.  Other rule types in the
validated pack are metadata for future detectors; they are never silently
misapplied to unrelated traffic.
"""

from datetime import datetime

from .alert_manager import create_alert
from .dedupe import default_deduplicator
from .explanations import reason_for_result, sanitize_reasons, suppressed_reason
from .flood_detector import evaluate_syn_flood, evaluate_udp_flood
from .recon_detector import evaluate_port_scan
from .suppression import (
    load_suppression_config,
    record_suppression_event,
)
from engine.rules.ids_pack import load_ids_rules

# Loading happens at import time: malformed or tampered rule packs fail fast.
IDS_RULE_PACK = load_ids_rules()
IDS_SUPPRESSION = load_suppression_config()

SUPPORTED_RULE_TYPES = frozenset({"port_scan", "syn_flood", "udp_flood"})


def get_rule_pack_info():
    """Small metadata object for operator APIs."""
    return {
        "pack_version": IDS_RULE_PACK.version,
        "schema_version": IDS_RULE_PACK.schema_version,
        "rule_count": len(IDS_RULE_PACK.rules),
        "supported_rule_types": sorted(SUPPORTED_RULE_TYPES),
        "rule_ids": list(IDS_RULE_PACK.rule_ids),
    }


def _evaluate(rule, packet, raw_packet, now):
    rule_type = rule["type"]
    if rule_type == "port_scan":
        return evaluate_port_scan(packet, rule, now=now)
    if rule_type == "syn_flood":
        return evaluate_syn_flood(packet, rule, raw_packet=raw_packet, now=now)
    if rule_type == "udp_flood":
        return evaluate_udp_flood(packet, rule, now=now)
    return None


def run_detection_pipeline(
    packet,
    raw_packet=None,
    *,
    now=None,
    pack=None,
    suppression=None,
    alert_factory=None,
    deduplicator=None,
    include_suppressed=False,
):
    """Evaluate one synthetic or normalized packet against the rule pack.

    ``now``, ``pack``, ``suppression``, ``deduplicator`` and ``alert_factory``
    are injectable so tests can use a frozen clock and avoid live logging or
    response actions.
    Suppressed detections are filtered from the returned alerts; with
    ``include_suppressed=True`` they are appended as records carrying a clear
    ``suppressed`` reason.
    """
    if not isinstance(packet, dict):
        return []
    src_ip = packet.get("src_ip")
    if not src_ip:
        return []

    active_pack = pack if pack is not None else IDS_RULE_PACK
    active_suppression = suppression if suppression is not None else IDS_SUPPRESSION
    emit_alert = alert_factory if alert_factory is not None else create_alert
    active_deduplicator = deduplicator if deduplicator is not None else default_deduplicator

    alerts = []
    suppressed = []
    for rule in active_pack.rules:
        if rule["type"] not in SUPPORTED_RULE_TYPES:
            continue
        result = _evaluate(rule, packet, raw_packet, now)
        if result is None or not result.matched:
            continue

        if not active_deduplicator.should_emit(
            (src_ip, rule["id"]), rule["time_window"], now=now
        ):
            continue

        reason = reason_for_result(result)
        decision = active_suppression.decide(src_ip, rule["id"])
        if decision is not None:
            record_suppression_event(src_ip, rule["id"], result.detector, decision.reason)
            if include_suppressed:
                suppressed.append({
                    "timestamp": str(datetime.now()) if now is None else str(now),
                    "attack": rule["name"],
                    "severity": rule["severity"],
                    "src_ip": src_ip,
                    "score": rule["score"],
                    "rule_id": rule["id"],
                    "suppressed": True,
                    "reasons": sanitize_reasons([
                        suppressed_reason(reason, decision.reason)
                    ]),
                })
            continue

        alerts.append(emit_alert(
            rule["name"],
            rule["severity"],
            src_ip,
            rule["score"],
            reasons=[reason],
            rule_id=rule["id"],
        ))

    if include_suppressed:
        return alerts + suppressed
    return alerts
