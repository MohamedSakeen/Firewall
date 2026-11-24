<<<<<<< HEAD
=======
from datetime import datetime
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
from collections import Counter

from flask import Blueprint, jsonify

<<<<<<< HEAD
from api.services.live_store import count_rule_entries, global_live_store
=======
from api.services.log_service import read_json_log, read_text_log, count_lines
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

alert_bp = Blueprint("alerts", __name__, url_prefix="/api")


@alert_bp.route("/alerts")
def get_alerts():
<<<<<<< HEAD
    return jsonify(global_live_store.alerts_snapshot())
=======
    alerts = read_json_log("alerts.json")
    return jsonify(alerts)
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955


@alert_bp.route("/dashboard/alerts/recent")
def get_recent_alerts():
<<<<<<< HEAD
    return jsonify(global_live_store.alerts_snapshot(limit=10))
=======
    alerts = read_json_log("alerts.json")
    return jsonify(alerts[-10:])
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955


@alert_bp.route("/dashboard/stats")
def get_dashboard_stats():
<<<<<<< HEAD
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
=======
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
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
    })
