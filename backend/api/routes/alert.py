from datetime import datetime
from collections import Counter

from flask import Blueprint, jsonify

from api.services.log_service import read_json_log, read_text_log, count_lines

alert_bp = Blueprint("alerts", __name__, url_prefix="/api")


@alert_bp.route("/alerts")
def get_alerts():
    alerts = read_json_log("alerts.json")
    return jsonify(alerts)


@alert_bp.route("/dashboard/alerts/recent")
def get_recent_alerts():
    alerts = read_json_log("alerts.json")
    return jsonify(alerts[-10:])


@alert_bp.route("/dashboard/stats")
def get_dashboard_stats():
    alerts = read_json_log("alerts.json")
    blocked_lines = read_text_log("blocked.log")
    traffic_lines = count_lines("traffic.json")

    total_alerts = len(alerts)
    total_blocked = len(blocked_lines)

    severity_counts = Counter(a.get("severity", "low") for a in alerts)
    critical_count = severity_counts.get("critical", 0)

    attack_counts = Counter(a.get("attack", "Unknown") for a in alerts)

    return jsonify({
        "totalPackets": max(traffic_lines, 0),
        "threatsBlocked": total_blocked,
        "idsAlerts": total_alerts,
        "criticalAlerts": critical_count,
        "activeRules": 842,
        "uptime": "14d 08h",
        "threatDistribution": [
            {"name": attack, "value": count}
            for attack, count in attack_counts.most_common(10)
        ]
    })
