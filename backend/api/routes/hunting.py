<<<<<<< HEAD
import ipaddress
import time

from flask import Blueprint, jsonify, request

from api.services.live_store import global_live_store
from engine.flow.flow_tracker import global_flow_tracker
=======
from flask import Blueprint, jsonify, request
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
from engine.hunting.hunting_engine import global_hunting_engine

hunting_bp = Blueprint("hunting", __name__, url_prefix="/api/threat-hunt")

<<<<<<< HEAD

def _valid_ip(value):
    if not value:
        return None
    try:
        return str(ipaddress.ip_address(str(value).strip()))
    except ValueError:
        return None


def _all_flows():
    with global_flow_tracker._lock:
        return [
            flow.to_dict()
            for flow in list(global_flow_tracker.active_flows.values()) + list(global_flow_tracker.closed_flows)
        ]


def _threat_scores_by_ip():
    scores = {}
    for alert in global_live_store.alerts_snapshot():
        ip = alert.get("src_ip")
        score = alert.get("threat_score") or alert.get("score") or 0
        if isinstance(score, (int, float)) and not isinstance(score, bool):
            scores[ip] = max(scores.get(ip, 0), score)
    for packet in global_live_store.packets_snapshot():
        score = packet.get("score") or 0
        if not isinstance(score, (int, float)) or isinstance(score, bool):
            continue
        for key in ("src_ip", "dst_ip"):
            ip = packet.get(key)
            scores[ip] = max(scores.get(ip, 0), score)
    return scores


@hunting_bp.route("/query", methods=["POST"])
def hunt_query():
    started = time.perf_counter()
    data = request.get_json(silent=True) or {}
    src_ip = _valid_ip(data.get("src_ip"))
    dst_ip = _valid_ip(data.get("dst_ip"))
    protocol = data.get("protocol")
    raw_score = data.get("min_threat_score", 0)
    if isinstance(raw_score, bool):
        return jsonify({"error": "valid min_threat_score required"}), 400
    try:
        min_threat_score = float(raw_score)
    except (TypeError, ValueError):
        return jsonify({"error": "valid min_threat_score required"}), 400

    scores = _threat_scores_by_ip()
    flows = []
    for flow in _all_flows():
        entry = dict(flow)
        entry["threat_score"] = max(
            scores.get(flow.get("src_ip"), 0),
            scores.get(flow.get("dst_ip"), 0),
        )
        flows.append(entry)

    res = global_hunting_engine.execute_search(
        flows,
        src_ip=src_ip,
        dst_ip=dst_ip,
        min_threat_score=min_threat_score,
        protocol=protocol,
    )
    res["query_ms"] = round((time.perf_counter() - started) * 1000, 3)
=======
@hunting_bp.route("/query", methods=["POST"])
def hunt_query():
    data = request.get_json() or {}
    src_ip = data.get("src_ip")
    dst_ip = data.get("dst_ip")
    min_threat_score = data.get("min_threat_score", 0)
    protocol = data.get("protocol")

    # Sample dataset for demonstration when live sniffer buffer is small
    sample_flows = [
        {"flow_id": "FL-001", "src_ip": "192.168.1.105", "dst_ip": "10.0.0.10", "dst_port": 22, "protocol": "TCP", "threat_score": 88, "bytes": 14200},
        {"flow_id": "FL-002", "src_ip": "192.168.1.105", "dst_ip": "10.0.0.20", "dst_port": 80, "protocol": "TCP", "threat_score": 65, "bytes": 8400},
        {"flow_id": "FL-003", "src_ip": "10.0.0.15", "dst_ip": "8.8.8.8", "dst_port": 53, "protocol": "UDP", "threat_score": 5, "bytes": 512},
        {"flow_id": "FL-004", "src_ip": "192.168.1.155", "dst_ip": "10.0.0.10", "dst_port": 443, "protocol": "TCP", "threat_score": 45, "bytes": 32000}
    ]

    res = global_hunting_engine.execute_search(
        sample_flows, 
        src_ip=src_ip, 
        dst_ip=dst_ip, 
        min_threat_score=min_threat_score, 
        protocol=protocol
    )
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
    return jsonify(res)
