from collections import Counter, defaultdict
from datetime import datetime

from flask import Blueprint, jsonify

from api.services.log_service import read_json_log

traffic_bp = Blueprint("traffic", __name__, url_prefix="/api")


@traffic_bp.route("/traffic")
def get_traffic():
    entries = read_json_log("traffic.json")
    return jsonify(entries)


@traffic_bp.route("/traffic/summary")
def get_traffic_summary():
    entries = read_json_log("traffic.json")

    total_packets = len(entries)
    rx_count = sum(1 for e in entries if e.get("src_ip", "").startswith("10."))
    tx_count = total_packets - rx_count

    buckets = defaultdict(lambda: {"rx": 0, "tx": 0})
    for e in entries:
        try:
            t = datetime.fromisoformat(e["time"])
            minute_key = t.strftime("%H:%M")
            if e.get("src_ip", "").startswith("10."):
                buckets[minute_key]["rx"] += 1
            else:
                buckets[minute_key]["tx"] += 1
        except (ValueError, KeyError):
            pass

    bandwidth_data = [
        {"time": k, "rx": v["rx"], "tx": v["tx"]}
        for k, v in sorted(buckets.items())
    ]

    src_connections = Counter(e["src_ip"] + ":" + str(e.get("src_port", "")) for e in entries if e.get("src_ip"))
    dst_connections = Counter(e["dst_ip"] + ":" + str(e.get("dst_port", "")) for e in entries if e.get("dst_ip"))

    active_connections = []
    for i, (addr, count) in enumerate(src_connections.most_common(20)):
        parts = addr.split(":")
        ip = parts[0]
        port = parts[1] if len(parts) > 1 else ""
        active_connections.append({
            "id": i + 1,
            "src": f"{ip}:{port}" if port else ip,
            "dst": "unknown",
            "state": "ESTABLISHED",
            "bytes": f"{count * 100} KB",
            "duration": "00:00"
        })

    return jsonify({
        "totalPackets": total_packets,
        "rxCount": rx_count,
        "txCount": tx_count,
        "bandwidthData": bandwidth_data,
        "activeConnections": active_connections
    })


@traffic_bp.route("/traffic/live")
def get_live_traffic():
    entries = read_json_log("traffic.json")
    return jsonify(entries[-50:])
