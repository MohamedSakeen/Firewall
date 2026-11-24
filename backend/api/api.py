import logging
import os
import sys
import threading
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO

BACKEND_DIR = str(Path(__file__).resolve().parent.parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

logger = logging.getLogger(__name__)
DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def get_allowed_origins():
    raw = os.getenv("FIREWALL_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    origins = []
    for item in raw.split(","):
        origin = item.strip()
        if not origin or origin == "*" or origin in origins:
            continue
        origins.append(origin)
    return origins


def sniffer_enabled():
    return os.getenv("FIREWALL_ENABLE_SNIFFER", "false").strip().lower() in {
        "1", "true", "yes", "on"
    }


socketio = SocketIO(cors_allowed_origins=get_allowed_origins())


def _apply_secure_headers(response):
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    )
    if request.is_secure:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    return response


def create_app():
    app = Flask(__name__)
    app.config["DEBUG"] = False
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
    origins = get_allowed_origins()
    app.config["CORS_ORIGINS"] = origins
    CORS(app, origins=origins)

    from api.routes.alert import alert_bp
    from api.routes.ips import ips_bp
    from api.routes.traffic import traffic_bp
    from api.routes.firewall import firewall_bp
    from api.routes.rules import rules_bp
    from api.routes.logs import logs_bp
    from api.routes.incidents import incidents_bp
    from api.routes.learning import learning_bp
    from api.routes.simulation import simulation_bp
    from api.routes.response import response_bp
    from api.routes.hunting import hunting_bp
    from api.routes.assets import assets_bp
    from api.routes.events import events_bp
    from api.routes.autonomy import autonomy_bp
    from api.routes.posture import posture_bp
    from engine.health.self_monitoring import global_self_monitoring

    app.register_blueprint(alert_bp)
    app.register_blueprint(ips_bp)
    app.register_blueprint(traffic_bp)
    app.register_blueprint(firewall_bp)
    app.register_blueprint(rules_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(incidents_bp)
    app.register_blueprint(learning_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(response_bp)
    app.register_blueprint(hunting_bp)
    app.register_blueprint(assets_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(autonomy_bp)
    app.register_blueprint(posture_bp)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify(global_self_monitoring.run_health_check())

    app.after_request(_apply_secure_headers)
    socketio.init_app(app, cors_allowed_origins=origins)
    return app


def _run_sniffer():
    from scapy.all import sniff
    from scapy.layers.inet import IP
    from api.services.live_store import global_live_store, packet_direction
    from api.services.websocket_service import (
        broadcast_alert,
        broadcast_incident_updated,
        broadcast_packet,
        broadcast_security_event,
    )
    from engine.IPS.ban_tracker import get_ban
    from engine.IDS.detection_pipeline import run_detection_pipeline
    from engine.firewall.engine import check_packet
    from engine.flow.flow_tracker import global_flow_tracker
    from engine.flow.window_aggregator import global_window_aggregator
    from engine.intelligence.assets.asset_manager import global_asset_manager
    from engine.intelligence.correlation.event_correlator import global_event_correlator
    from engine.packet.packet_normalizer import normalize_packet
    from engine.scoring.score_engine import calculate_threat_score
    from engine.scoring.threat_tracker import get_threat_event

    def register_observed_asset(ip, direction):
        if not ip or ip in global_asset_manager.assets:
            return
        global_asset_manager.register_asset(
            ip,
            hostname="",
            role="OBSERVED_ENDPOINT",
            criticality="UNKNOWN",
            segment="LOCAL" if direction in ("RX", "INTERNAL", "TX") else "REMOTE",
            owner="UNKNOWN",
        )

    def process_packet(packet):
        if IP not in packet:
            return

        normalized = normalize_packet(packet)
        src_ip = normalized.get("src_ip")
        dst_ip = normalized.get("dst_ip")
        if not src_ip or not dst_ip:
            return

        normalized["size"] = len(bytes(packet))
        normalized["payload_size"] = len(bytes(packet.payload))
        flow = global_flow_tracker.process_packet(normalized)
        if flow is not None:
            global_window_aggregator.add_flow_sample(flow.to_dict())

        direction = packet_direction(src_ip, dst_ip)
        register_observed_asset(src_ip, direction)
        register_observed_asset(dst_ip, direction)

        firewall_result = check_packet(src_ip, normalized.get("dst_port"))
        alerts = run_detection_pipeline(normalized, packet)
        threat_events = get_threat_event(src_ip)
        score = calculate_threat_score(threat_events) if threat_events else 0

        entry = global_live_store.record_packet(normalized, normalized["size"], firewall_result, score)
        broadcast_packet(entry)

        for alert in alerts:
            ban = get_ban(src_ip)
            action = "BLOCK" if ban else "ALERT"
            record, event = global_live_store.record_alert(
                alert,
                destination_ip=dst_ip,
                destination_port=normalized.get("dst_port"),
                protocol=normalized.get("protocol"),
                action=action,
            )
            incident = global_event_correlator.process_alert(record)
            broadcast_alert(record)
            broadcast_security_event(event)
            if incident is not None:
                broadcast_incident_updated(incident.to_dict())

    try:
        sniff(prn=process_packet, store=False)
    except Exception:
        logger.exception("Packet capture unavailable; live traffic ingestion is disabled")


def start_sniffer_if_enabled(app=None):
    log = app.logger if app is not None else logger
    if not sniffer_enabled():
        log.info("Packet sniffer disabled (set FIREWALL_ENABLE_SNIFFER=1 to enable)")
        return None
    thread = threading.Thread(target=_run_sniffer, name="packet-sniffer", daemon=True)
    thread.start()
    log.info("Packet sniffer enabled")
    return thread


def run_server():
    app = create_app()
    start_sniffer_if_enabled(app)
    host = os.getenv("FIREWALL_HOST", "127.0.0.1").strip() or "127.0.0.1"
    try:
        port = int(os.getenv("FIREWALL_PORT", "5000"))
        if not 1 <= port <= 65535:
            raise ValueError("port out of range")
    except (TypeError, ValueError):
        logger.warning("Invalid FIREWALL_PORT; using 5000")
        port = 5000
    socketio.run(app, host=host, port=port, debug=False)


if __name__ == "__main__":
    run_server()
