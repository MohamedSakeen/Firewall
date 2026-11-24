from flask import Blueprint, jsonify

from api.services.live_store import global_live_store
from engine.flow.flow_tracker import global_flow_tracker

traffic_bp = Blueprint("traffic", __name__, url_prefix="/api")


def _endpoint(address, port):
    if port is None:
        return address
    return f"{address}:{port}"


@traffic_bp.route("/traffic")
def get_traffic():
    return jsonify(global_live_store.packets_snapshot())


@traffic_bp.route("/traffic/summary")
def get_traffic_summary():
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
    })


@traffic_bp.route("/traffic/live")
def get_live_traffic():
    return jsonify(global_live_store.packets_snapshot(limit=50))
