from datetime import datetime
from api.api import socketio


def broadcast_packet(entry):
    flat = {
        "id": entry.get("timestamp"),
        "time": datetime.fromtimestamp(entry["timestamp"]).strftime("%H:%M:%S.%f")[:12],
        "src": f"{entry.get('src_ip')}:{entry.get('src_port')}",
        "dst": f"{entry.get('dst_ip')}:{entry.get('dst_port')}",
        "proto": entry.get("protocol"),
        "len": entry.get("size"),
        "flags": entry.get("tcp_flags"),
        "score": entry.get("score"),
        "direction": entry.get("direction"),
        "decision": entry.get("decision"),
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
