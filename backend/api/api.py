import sys
import threading
from pathlib import Path

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

BACKEND_DIR = str(Path(__file__).resolve().parent.parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

socketio = SocketIO(cors_allowed_origins="*")


def create_app():
    app = Flask(__name__)
    CORS(app)

    from api.routes.alert import alert_bp
    from api.routes.ips import ips_bp
    from api.routes.traffic import traffic_bp
    from api.routes.firewall import firewall_bp
    from api.routes.rules import rules_bp
    from api.routes.logs import logs_bp

    app.register_blueprint(alert_bp)
    app.register_blueprint(ips_bp)
    app.register_blueprint(traffic_bp)
    app.register_blueprint(firewall_bp)
    app.register_blueprint(rules_bp)
    app.register_blueprint(logs_bp)

    socketio.init_app(app)
    return app


def _run_sniffer():
    from scapy.all import sniff
    from scapy.layers.inet import IP, TCP
    from engine.packet.packet_normalizer import normalize_packet
    from engine.firewall.engine import check_packet
    from engine.IDS.detection_pipeline import run_detection_pipeline
    from api.services.websocket_service import broadcast_packet

    def process_packet(packet):
        if IP in packet and TCP in packet:
            normalized = normalize_packet(packet)
            broadcast_packet(normalized)

            src_ip = packet[IP].src
            dst_port = packet[TCP].dport
            firewall_result = check_packet(src_ip, dst_port)
            print(f"{src_ip}:{packet[IP].dst}:{dst_port} -> {firewall_result}")
            run_detection_pipeline(normalized, packet)

    sniff(prn=process_packet, store=False)


if __name__ == "__main__":
    app = create_app()
    t = threading.Thread(target=_run_sniffer, daemon=True)
    t.start()
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
