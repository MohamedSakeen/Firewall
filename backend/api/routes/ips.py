import ipaddress
import time

from flask import Blueprint, jsonify, request

from api.services.live_store import global_live_store
from engine.IPS.ban_tracker import add_ban, get_ban, remove_ban
from engine.firewall.blocker import block_ip

ips_bp = Blueprint("ips", __name__, url_prefix="/api")


def _valid_ip(value):
    if not isinstance(value, str):
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


@ips_bp.route("/blocked")
def get_blocked():
    now = time.time()
    blocked = []

    for entry in global_live_store.blocks_snapshot():
        record = {
            "ip": entry.get("ip"),
            "reason": entry.get("reason"),
            "blockedAt": entry.get("blocked_at"),
            "source": entry.get("source"),
            "duration": entry.get("duration"),
            "expires": None,
            "expired": False,
        }
        ban = get_ban(entry.get("ip"))
        if ban:
            duration = ban.get("duration")
            record["duration"] = duration
            if duration is not None:
                expires_at = ban.get("start_time", 0) + duration
                record["expires"] = expires_at
                record["expired"] = now >= expires_at
        blocked.append(record)

    return jsonify(blocked)


@ips_bp.route("/block", methods=["POST"])
def block_ip_route():
    data = request.get_json(silent=True) or {}
    ip = _valid_ip(data.get("ip"))
    reason = data.get("reason")
    if not ip:
        return jsonify({"error": "valid ip required"}), 400
    if not isinstance(reason, str) or not reason.strip():
        return jsonify({"error": "reason required"}), 400

    raw_duration = data.get("duration")
    if isinstance(raw_duration, bool) or raw_duration is None:
        return jsonify({"error": "valid duration required"}), 400
    try:
        duration = float(raw_duration)
    except (TypeError, ValueError):
        return jsonify({"error": "valid duration required"}), 400
    if duration <= 0:
        return jsonify({"error": "valid duration required"}), 400

    reason = reason.strip()
    block_ip(ip)
    add_ban(ip, duration, reason)
    global_live_store.record_block(ip, reason, duration=duration, source="manual")

    try:
        from api.services.websocket_service import broadcast_block

        broadcast_block(ip, reason)
    except Exception:
        pass

    return jsonify({"status": "blocked", "ip": ip, "reason": reason, "duration": duration})


@ips_bp.route("/unblock", methods=["POST"])
def unblock_ip():
    data = request.get_json(silent=True) or {}
    ip = _valid_ip(data.get("ip"))
    if not ip:
        return jsonify({"error": "valid ip required"}), 400

    remove_ban(ip)
    global_live_store.record_unblock(ip)
    return jsonify({"status": "unblocked", "ip": ip})
