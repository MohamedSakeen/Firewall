from collections import Counter

from flask import Blueprint, jsonify

from api.services.live_store import count_rule_entries, global_live_store
from engine.IDS.detection_pipeline import get_rule_pack_info
from engine.IDS.suppression import suppression_snapshot

alert_bp = Blueprint("alerts", __name__, url_prefix="/api")


@alert_bp.route("/alerts")
def get_alerts():
    return jsonify(global_live_store.alerts_snapshot())


@alert_bp.route("/dashboard/alerts/recent")
def get_recent_alerts():
    return jsonify(global_live_store.alerts_snapshot(limit=10))


@alert_bp.route("/alerts/detection")
def get_detection_info():
    """Expose rule-pack provenance and filtered detections with reasons."""
    return jsonify({
        "rule_pack": get_rule_pack_info(),
        "suppressed": suppression_snapshot(limit=100),
    })


@alert_bp.route("/dashboard/stats")
def get_dashboard_stats():
    alerts = global_live_store.alerts_snapshot(limit=2000)
    severity_counts = Counter(str(alert.get("severity", "")).upper() for alert in alerts)
    attack_counts = Counter(alert.get("attack", "Unknown") for alert in alerts)

    return jsonify({
        "totalPackets": global_live_store.packet_count,
        "threatsBlocked": len(global_live_store.blocks_snapshot()),
        "idsAlerts": len(alerts),
        "criticalAlerts": severity_counts.get("CRITICAL", 0),
        "activeRules": count_rule_entries(),
        "uptime": global_live_store.uptime(),
        "threatDistribution": [
            {"name": attack, "value": count}
            for attack, count in attack_counts.most_common(10)
        ],
    })
