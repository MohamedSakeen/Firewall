import logging
import os
import secrets
import sys
import threading
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_login import LoginManager, current_user
from flask_socketio import SocketIO
from flask_wtf.csrf import CSRFProtect

BACKEND_DIR = str(Path(__file__).resolve().parent.parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from auth.api import auth_bp, limiter  # noqa: E402
from auth.audit import audit_request  # noqa: E402
from auth.db import init_db  # noqa: E402
from auth.store import get_user_by_id  # noqa: E402
from ops import alerts as ops_alerts  # noqa: E402
from ops import metrics as ops_metrics  # noqa: E402
from ops.logging_config import configure_logging  # noqa: E402
from ops.retention import prune_log_files  # noqa: E402
from storage.events import record_event as persist_event  # noqa: E402

logger = logging.getLogger(__name__)
DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
FIREWALL_ROLES = ("all", "api", "worker")
READ_METHODS = {"GET", "HEAD"}
ADMIN_PATH_PREFIXES = (
    "/api/rules/",
    "/api/firewall/rules",
    "/api/autonomy/",
    "/api/auth/users",
    "/api/responses/approvals",
)
TRUTHY = {"1", "true", "yes", "on"}


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
    return os.getenv("FIREWALL_ENABLE_SNIFFER", "false").strip().lower() in TRUTHY


def get_firewall_role():
    """Return the process role: all (default), api, or worker."""
    role = os.getenv("FIREWALL_ROLE", "all").strip().lower()
    if role in FIREWALL_ROLES:
        return role
    if role:
        logger.warning("Invalid FIREWALL_ROLE; using 'all'")
    return "all"


def cookie_secure_enabled():
    return os.getenv("FIREWALL_COOKIE_SECURE", "false").strip().lower() in TRUTHY


def _safe_alert(level, title, detail):
    """Best-effort local notification; capture must continue on failure."""
    try:
        ops_alerts.queue_alert(level, title, detail)
    except Exception:
        logger.warning("could not queue %s ops alert", level)


def _record_enforcement_failure(source):
    ops_metrics.increment("enforcement_failures")
    _safe_alert("error", "Enforcement failure", f"source={_alert_source(source)}")


def _alert_source(source):
    """Keep route names only; never place request data in alert details."""
    allowed = {
        "/api/block": "manual-block",
        "/api/unblock": "manual-unblock",
    }
    if source in allowed:
        return allowed[source]
    if source == "/api/autonomy/rollback":
        return "rollback-enforcement"
    if isinstance(source, str) and source.startswith("/api/responses/approvals/"):
        return "approval-enforcement"
    return "api"


def _persist_event(event_type, payload):
    """Best-effort durable write; capture must continue if storage fails."""
    try:
        result = persist_event(event_type, payload)
    except Exception:
        ops_metrics.increment("event_write_failures")
        logger.exception("could not persist %s event; capture continues", event_type)
        return None
    ops_metrics.increment("event_writes")
    return result


def prune_expired_events(log=None):
    """Apply the configured retention window during startup."""
    log = log or logger
    try:
        from storage.events import prune_events

        removed = prune_events()
    except Exception:
        log.exception("Event retention cleanup failed; startup continues")
        return
    if removed:
        log.info("Removed %d expired events", removed)


def _is_public_api_path(path):
    return path == "/api/health" or path.startswith("/api/auth/")


def _is_admin_api_path(path):
    return any(
        path == prefix or path.startswith(prefix.rstrip("/") + "/")
        for prefix in ADMIN_PATH_PREFIXES
    )


def _configure_auth(app):
    secret = os.getenv("FIREWALL_SECRET_KEY", "").strip()
    if secret:
        app.config["SECRET_KEY"] = secret
    else:
        app.config["SECRET_KEY"] = secrets.token_hex(32)
        app.logger.warning(
            "FIREWALL_SECRET_KEY is not set; using an ephemeral session key. "
            "Sessions will be invalidated when the process restarts."
        )

    secure_cookie = cookie_secure_enabled()
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Strict",
        SESSION_COOKIE_SECURE=secure_cookie,
        REMEMBER_COOKIE_HTTPONLY=True,
        REMEMBER_COOKIE_SAMESITE="Strict",
        REMEMBER_COOKIE_SECURE=secure_cookie,
        WTF_CSRF_TIME_LIMIT=3600,
    )

    init_db()
    CSRFProtect(app)

    login_manager = LoginManager()
    login_manager.session_protection = "strong"

    @login_manager.user_loader
    def load_user(user_id):
        user = get_user_by_id(user_id)
        return user if user is not None and user.is_active else None

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "authentication required"}), 401

    login_manager.init_app(app)
    limiter.init_app(app)


socketio = SocketIO(cors_allowed_origins=get_allowed_origins())

# A process runs at most one capture thread. Tests reset this through monkeypatch.
_sniffer_lock = threading.Lock()
_sniffer_thread = None


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


def _record_request_metrics(response):
    """Aggregate request counts without recording paths or identities."""
    ops_metrics.increment_http(response.status_code)
    if not request.path.startswith("/api/") or request.method != "POST":
        return response

    path = request.path
    raw_payload = response.get_json(silent=True) if response.is_json else None
    payload = raw_payload if isinstance(raw_payload, dict) else {}
    is_approve = path.startswith("/api/responses/approvals/") and path.endswith("/approve")
    is_enforcement_path = path in {"/api/block", "/api/unblock", "/api/autonomy/rollback"} or is_approve

    if path == "/api/block" and response.status_code == 200:
        ops_metrics.increment("blocks")
    elif path == "/api/unblock" and response.status_code == 200:
        ops_metrics.increment("unblocks")
    elif is_approve and response.status_code == 200 and payload.get("status") == "ENFORCED":
        ops_metrics.increment("blocks")
    elif (
        path == "/api/autonomy/rollback"
        and response.status_code == 200
        and payload.get("status") == "SUCCESS"
    ):
        ops_metrics.increment("unblocks")

    failed = response.status_code >= 500 and is_enforcement_path
    if payload.get("warning"):
        failed = True
    if failed:
        _record_enforcement_failure(path)
    return response


def create_app():
    configure_logging()
    app = Flask(__name__)
    app.config["DEBUG"] = False
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
    origins = get_allowed_origins()
    app.config["CORS_ORIGINS"] = origins
    CORS(app, origins=origins, supports_credentials=True)

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
    from api.routes.ops import ops_bp

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
    app.register_blueprint(ops_bp)
    app.register_blueprint(auth_bp)

    _configure_auth(app)
    from engine.IPS.response_controller import configure_autonomy_level

    configure_autonomy_level()
    prune_expired_events(app.logger)
    prune_log_files(log=app.logger)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "ok"})

    @app.before_request
    def enforce_api_auth():
        path = request.path
        if not path.startswith("/api/") or _is_public_api_path(path):
            return None
        # Let browser CORS preflights through; every actual request needs login.
        if request.method == "OPTIONS":
            return None
        if not current_user.is_authenticated:
            return jsonify({"error": "authentication required"}), 401
        if request.method not in READ_METHODS and current_user.role not in {
            "operator", "admin"
        }:
            return jsonify({"error": "forbidden"}), 403
        if _is_admin_api_path(path) and current_user.role != "admin":
            return jsonify({"error": "forbidden"}), 403
        return None

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify({"error": "too many requests"}), 429

    app.after_request(audit_request)
    app.after_request(_apply_secure_headers)
    app.after_request(_record_request_metrics)
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

    def _process_packet(packet):
        if IP not in packet:
            return

        normalized = normalize_packet(packet)
        src_ip = normalized.get("src_ip")
        dst_ip = normalized.get("dst_ip")
        if not src_ip or not dst_ip:
            return

        ops_metrics.increment("packets")
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
        _persist_event("packet", {
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": normalized.get("src_port"),
            "dst_port": normalized.get("dst_port"),
            "protocol": normalized.get("protocol"),
            "size": normalized["size"],
            "direction": direction,
            "decision": firewall_result,
            "score": score,
        })

        for alert in alerts:
            ops_metrics.increment("alerts")
            ban = get_ban(src_ip)
            action = "BLOCK" if ban else "ALERT"
            record, event = global_live_store.record_alert(
                alert,
                destination_ip=dst_ip,
                destination_port=normalized.get("dst_port"),
                protocol=normalized.get("protocol"),
                action=action,
            )
            severity = str(record.get("severity") or "").upper()
            if severity in {"HIGH", "CRITICAL"}:
                _safe_alert(
                    "critical" if severity == "CRITICAL" else "high",
                    "IDS alert",
                    f"severity={severity}",
                )
            incident = global_event_correlator.process_alert(record)
            broadcast_alert(record)
            broadcast_security_event(event)
            _persist_event("alert", {
                "alert_id": record.get("alert_id"),
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "attack": record.get("attack"),
                "severity": record.get("severity"),
                "score": record.get("score"),
                "action": action,
            })
            _persist_event("security_event", {
                "event_id": event.get("event_id"),
                "event_type": event.get("event_type"),
                "src_ip": event.get("source_ip"),
                "dst_ip": event.get("destination_ip"),
                "severity": event.get("severity"),
                "threat_score": event.get("threat_score"),
            })
            if incident is not None:
                incident_data = incident.to_dict()
                broadcast_incident_updated(incident_data)
                _persist_event("incident", {
                    "incident_id": incident_data.get("incident_id"),
                    "src_ip": incident_data.get("attacker_ip"),
                    "status": incident_data.get("status"),
                    "severity": incident_data.get("severity"),
                    "threat_score": incident_data.get("threat_score"),
                })

    def process_packet(packet):
        try:
            _process_packet(packet)
        except Exception:
            ops_metrics.increment("sniffer_errors")
            logger.exception("packet processing failed; capture continues")

    ops_metrics.set_gauge("sniffer_active", 1)
    try:
        sniff(prn=process_packet, store=False)
    except Exception:
        ops_metrics.increment("sniffer_errors")
        logger.exception("Packet capture unavailable; live traffic ingestion is disabled")
    finally:
        ops_metrics.set_gauge("sniffer_active", 0)


def start_sniffer_if_enabled(app=None):
    """Start the single capture thread allowed in this process."""
    global _sniffer_thread
    log = app.logger if app is not None else logger
    role = get_firewall_role()
    if role == "api":
        ops_metrics.set_gauge("sniffer_active", 0)
        log.info("FIREWALL_ROLE=api; packet capture is disabled")
        return None
    if not sniffer_enabled():
        ops_metrics.set_gauge("sniffer_active", 0)
        log.info("Packet sniffer disabled (set FIREWALL_ENABLE_SNIFFER=1 to enable)")
        return None
    with _sniffer_lock:
        if _sniffer_thread is not None:
            log.info("Packet sniffer already running in this process")
            return _sniffer_thread
        _sniffer_thread = threading.Thread(target=_run_sniffer, name="packet-sniffer", daemon=True)
        _sniffer_thread.start()
        ops_metrics.set_gauge("sniffer_active", 1)
    log.info("Packet sniffer enabled")
    return _sniffer_thread


def _wait_for_shutdown():
    """Block until interrupted; overridable in tests."""
    threading.Event().wait()


def run_worker():
    """Start capture only, with no HTTP or WebSocket server in this process."""
    configure_logging()
    init_db()
    prune_expired_events(logger)
    prune_log_files(log=logger)
    thread = start_sniffer_if_enabled()
    if thread is None:
        logger.warning("Worker has no capture thread; check FIREWALL_ROLE and FIREWALL_ENABLE_SNIFFER")
        return 2
    try:
        _wait_for_shutdown()
    except KeyboardInterrupt:
        logger.info("Capture worker stopped")
    return 0


def run_server():
    if get_firewall_role() == "worker":
        return run_worker()
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
    return 0


if __name__ == "__main__":
    raise SystemExit(run_server())
