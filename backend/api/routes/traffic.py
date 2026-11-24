<<<<<<< HEAD
from flask import Blueprint, jsonify

from api.services.live_store import global_live_store
from engine.flow.flow_tracker import global_flow_tracker
=======
from collections import Counter, defaultdict
from datetime import datetime

from flask import Blueprint, jsonify

from api.services.log_service import read_json_log
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

traffic_bp = Blueprint("traffic", __name__, url_prefix="/api")


<<<<<<< HEAD
def _endpoint(address, port):
    if port is None:
        return address
    return f"{address}:{port}"


@traffic_bp.route("/traffic")
def get_traffic():
    return jsonify(global_live_store.packets_snapshot())
=======
@traffic_bp.route("/traffic")
def get_traffic():
    entries = read_json_log("traffic.json")
    return jsonify(entries)
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955


@traffic_bp.route("/traffic/summary")
def get_traffic_summary():
<<<<<<< HEAD
    active_connections = [
        {
            "id": flow.get("flow_id"),
            "src": _endpoint(flow.get("src_ip"), flow.get("src_port")),
            "dst": _endpoint(flow.get("dst_ip"), flow.get("dst_port")),
            "state": flow.get("state"),
            "bytes": (flow.get("bytes_sent") or 0) + (flow.get("bytes_received") or 0),
            "duration": flow.get("duration"),
        }
        for flow in global_flow_tracker.get_all_active_flows()
    ]

    return jsonify({
        "totalPackets": global_live_store.packet_count,
        "rxCount": global_live_store.rx_count,
        "txCount": global_live_store.tx_count,
        "bandwidthData": global_live_store.bandwidth_data(),
        "activeConnections": active_connections,
        "capturing": global_live_store.packet_count > 0,
=======
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
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
    })


@traffic_bp.route("/traffic/live")
def get_live_traffic():
<<<<<<< HEAD
    return jsonify(global_live_store.packets_snapshot(limit=50))
=======
    entries = read_json_log("traffic.json")
    return jsonify(entries[-50:])
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
