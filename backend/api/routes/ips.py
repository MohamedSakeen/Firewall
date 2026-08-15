import re
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request

from api.services.log_service import read_text_log
from engine.IPS.ban_tracker import banned_ips, add_ban, remove_ban

ips_bp = Blueprint("ips", __name__, url_prefix="/api")

BLOCK_PATTERN = re.compile(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+) - Blocked IP: (\S+)")
LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"


@ips_bp.route("/blocked")
def get_blocked():
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

    return jsonify(blocked)


@ips_bp.route("/block", methods=["POST"])
def block_ip_route():
    data = request.get_json(silent=True) or {}
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
        broadcast_block(ip, reason)
    except Exception:
        pass

    return jsonify({"status": "blocked", "ip": ip, "reason": reason})


@ips_bp.route("/unblock", methods=["POST"])
def unblock_ip():
    data = request.get_json(silent=True) or {}
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

