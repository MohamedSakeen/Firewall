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

def broadcast_learning_observation(data):
    socketio.emit("learning.observation", data)

def broadcast_learning_rejected(data):
    socketio.emit("learning.rejected", data)

def broadcast_baseline_updated(data):
    socketio.emit("baseline.updated", data)

def broadcast_anomaly_detected(data):
    socketio.emit("anomaly.detected", data)

def broadcast_security_event(data):
    socketio.emit("security_event.created", data)

def broadcast_incident_updated(data):
    socketio.emit("incident.updated", data)

def broadcast_response_recommended(data):
    socketio.emit("response.recommended", data)

def broadcast_response_verified(data):
    socketio.emit("response.verified", data)

def broadcast_drift_detected(data):
    socketio.emit("drift.detected", data)
