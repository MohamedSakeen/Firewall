import ipaddress
import logging
import math
import time

from flask import Blueprint, jsonify, request

from api.services.live_store import global_live_store
from engine.IPS.ban_tracker import add_ban, get_ban
from engine.IPS.unblock_manager import cleanup_expired_bans
from engine.IPS.unblock_manager import unblock_ip as remove_block
from engine.firewall.blocker import block_ip

ips_bp = Blueprint("ips", __name__, url_prefix="/api")

logger = logging.getLogger(__name__)
MIN_DURATION = 1
MAX_DURATION = 7 * 24 * 60 * 60
MAX_REASON_LENGTH = 200


def _valid_ip(value):
    if not isinstance(value, str):
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


@ips_bp.route("/blocked")
def get_blocked():
    for ip in cleanup_expired_bans():
        global_live_store.record_unblock(ip)

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
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) - {"ip", "reason", "duration"}:
        return jsonify({"error": "invalid request"}), 400

    ip = _valid_ip(data.get("ip"))
    if not ip:
        return jsonify({"error": "valid ip required"}), 400

    reason = data.get("reason")
    if not isinstance(reason, str) or not reason.strip() or len(reason) > MAX_REASON_LENGTH:
        return jsonify({"error": "reason required (max 200 characters)"}), 400

    raw_duration = data.get("duration")
    if isinstance(raw_duration, bool) or raw_duration is None:
        return jsonify({"error": "valid duration required"}), 400
    try:
        duration = float(raw_duration)
    except (TypeError, ValueError, OverflowError):
        return jsonify({"error": "valid duration required"}), 400
    if not math.isfinite(duration) or not MIN_DURATION <= duration <= MAX_DURATION:
        return jsonify({"error": "duration out of range"}), 400

    result = block_ip(ip)
    if not isinstance(result, dict) or not result.get("ok"):
        logger.warning("block enforcement failed: %s", (result or {}).get("message", "unknown error"))
        return jsonify({"error": "block enforcement failed"}), 503

    reason = reason.strip()
    add_ban(ip, duration, reason)
    global_live_store.record_block(ip, reason, duration=duration, source="manual")

    try:
        from api.services.websocket_service import broadcast_block

        broadcast_block(ip, reason)
    except Exception:
        logger.warning("block broadcast failed")

    return jsonify({"status": "blocked", "ip": ip, "reason": reason, "duration": duration})


@ips_bp.route("/unblock", methods=["POST"])
def unblock_ip():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) - {"ip"}:
        return jsonify({"error": "invalid request"}), 400

    ip = _valid_ip(data.get("ip"))
    if not ip:
        return jsonify({"error": "valid ip required"}), 400

    result = remove_block(ip)
    global_live_store.record_unblock(ip)

    response = {"status": "unblocked", "ip": ip}
    if isinstance(result, dict) and result.get("ok"):
        response["enforcement"] = "os"
    else:
        logger.warning("unblock enforcement failed: %s", (result or {}).get("message", "unknown error"))
        response["enforcement"] = "unavailable"
        response["warning"] = "OS rule removal failed; see server logs"
    return jsonify(response)
