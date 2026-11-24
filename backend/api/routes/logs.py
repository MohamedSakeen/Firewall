from flask import Blueprint, jsonify

from api.services.live_store import global_live_store

logs_bp = Blueprint("logs", __name__, url_prefix="/api")


@logs_bp.route("/logs")
def get_logs():
    snapshot = global_live_store.logs_snapshot()
    return jsonify({
        "alerts": snapshot.get("alerts", []),
        "blocked": snapshot.get("blocked", []),
        "ids": snapshot.get("ids", []),
        "ips": snapshot.get("ips", []),
        "firewall": snapshot.get("firewall", []),
        "threat_score": snapshot.get("threat_score", []),
        "correlated": snapshot.get("correlated", snapshot.get("correlation", [])),
        "traffic": snapshot.get("traffic", []),
    })
