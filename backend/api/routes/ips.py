<<<<<<< HEAD
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
=======
import re
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request

from api.services.log_service import read_text_log
from engine.IPS.ban_tracker import banned_ips, add_ban, remove_ban

ips_bp = Blueprint("ips", __name__, url_prefix="/api")

BLOCK_PATTERN = re.compile(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+) - Blocked IP: (\S+)")
LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955


@ips_bp.route("/blocked")
def get_blocked():
<<<<<<< HEAD
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
=======
    lines = read_text_log("blocked.log")
    blocked = []
    seen = set()

    for line in reversed(lines):
        m = BLOCK_PATTERN.match(line)
        if m:
            ts_str, ip = m.groups()
            if ip in seen:
                continue
            seen.add(ip)
            ban_info = banned_ips.get(ip)
            if ban_info:
                blocked.append({
                    "ip": ip,
                    "reason": ban_info.get("reason", "IPS Block"),
                    "blockedAt": ts_str,
                    "expires": f"{ban_info.get('duration', 3600)}s",
                    "duration": "temporary"
                })
            else:
                blocked.append({
                    "ip": ip,
                    "reason": "Manual Block",
                    "blockedAt": ts_str,
                    "expires": "Permanent",
                    "duration": "indefinite"
                })
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

    return jsonify(blocked)


@ips_bp.route("/block", methods=["POST"])
def block_ip_route():
    data = request.get_json(silent=True) or {}
<<<<<<< HEAD
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

=======
    ip = data.get("ip")
    reason = data.get("reason", "Manual Block")
    if not ip:
        return jsonify({"error": "ip required"}), 400

    add_ban(ip, 3600, reason)
    log_file = LOG_DIR / "blocked.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    with log_file.open("a", encoding="utf-8") as f:
        f.write(f"{ts} - Blocked IP: {ip}\n")

    try:
        from api.services.websocket_service import broadcast_block
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        broadcast_block(ip, reason)
    except Exception:
        pass

<<<<<<< HEAD
    return jsonify({"status": "blocked", "ip": ip, "reason": reason, "duration": duration})
=======
    return jsonify({"status": "blocked", "ip": ip, "reason": reason})
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955


@ips_bp.route("/unblock", methods=["POST"])
def unblock_ip():
    data = request.get_json(silent=True) or {}
<<<<<<< HEAD
    ip = _valid_ip(data.get("ip"))
    if not ip:
        return jsonify({"error": "valid ip required"}), 400

    remove_ban(ip)
    global_live_store.record_unblock(ip)
    return jsonify({"status": "unblocked", "ip": ip})
=======
    ip = data.get("ip")
    if not ip:
        return jsonify({"error": "ip required"}), 400
    remove_ban(ip)

    log_file = LOG_DIR / "blocked.log"
    if log_file.exists():
        lines = log_file.read_text(encoding="utf-8").splitlines()
        new_lines = [l for l in lines if f"Blocked IP: {ip}" not in l]
        log_file.write_text("\n".join(new_lines) + ("\n" if new_lines else ""), encoding="utf-8")

    return jsonify({"status": "unblocked", "ip": ip})

>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
