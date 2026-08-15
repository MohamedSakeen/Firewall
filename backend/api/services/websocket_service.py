from datetime import datetime
from api.api import socketio

_packet_counter = 0


def broadcast_packet(packet_data):
    global _packet_counter
    _packet_counter += 1
    tcp_flags_str = str(packet_data.get("tcp_flags", "")) if packet_data.get("tcp_flags") is not None else "none"

    flat = {
        "id": _packet_counter,
        "time": datetime.now().strftime("%H:%M:%S.%f")[:12],
        "src": f"{packet_data.get('src_ip', '?')}:{packet_data.get('src_port', '?')}",
        "dst": f"{packet_data.get('dst_ip', '?')}:{packet_data.get('dst_port', '?')}",
        "proto": packet_data.get("protocol", "?"),
        "len": 64,
        "flags": tcp_flags_str,
        "score": 0,
    }
    socketio.emit("packet", flat)


def broadcast_alert(alert_data):
    socketio.emit("alert", alert_data)


def broadcast_block(ip, reason):
    socketio.emit("block", {"ip": ip, "reason": reason, "timestamp": str(datetime.now())})
