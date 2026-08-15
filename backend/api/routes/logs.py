from flask import Blueprint, jsonify

from api.services.log_service import read_text_log

logs_bp = Blueprint("logs", __name__, url_prefix="/api")


@logs_bp.route("/logs")
def get_logs():
    return jsonify({
        "alerts": read_text_log("alerts.log"),
        "blocked": read_text_log("blocked.log"),
        "ids": read_text_log("ids_alerts.log"),
        "ips": read_text_log("ips_actions.log"),
        "firewall": read_text_log("firewall_events.log"),
        "threat_score": read_text_log("threat_score.log"),
        "correlated": read_text_log("correlated_alerts.log"),
    })
