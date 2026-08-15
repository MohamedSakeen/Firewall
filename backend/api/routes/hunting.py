from flask import Blueprint, jsonify, request
from engine.hunting.hunting_engine import global_hunting_engine

hunting_bp = Blueprint("hunting", __name__, url_prefix="/api/threat-hunt")

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
    return jsonify(res)
