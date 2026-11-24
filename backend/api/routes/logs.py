from flask import Blueprint, jsonify

<<<<<<< HEAD
from api.services.live_store import global_live_store
=======
from api.services.log_service import read_text_log
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

logs_bp = Blueprint("logs", __name__, url_prefix="/api")


@logs_bp.route("/logs")
def get_logs():
<<<<<<< HEAD
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
=======
    return jsonify({
        "alerts": read_text_log("alerts.log"),
        "blocked": read_text_log("blocked.log"),
        "ids": read_text_log("ids_alerts.log"),
        "ips": read_text_log("ips_actions.log"),
        "firewall": read_text_log("firewall_events.log"),
        "threat_score": read_text_log("threat_score.log"),
        "correlated": read_text_log("correlated_alerts.log"),
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
    })
