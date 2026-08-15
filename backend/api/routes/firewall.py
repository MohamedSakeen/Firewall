import json
from pathlib import Path

from flask import Blueprint, jsonify, request

firewall_bp = Blueprint("firewall", __name__, url_prefix="/api")

BASE = Path(__file__).resolve().parent.parent.parent / "engine" / "rules" / "firewall"


@firewall_bp.route("/firewall/rules", methods=["GET"])
def get_firewall_rules():
    path = BASE / "rules.json"
    if not path.exists():
        return jsonify({"blocked_ips": [], "blocked_ports": []})
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception:
        return jsonify({"blocked_ips": [], "blocked_ports": []})


@firewall_bp.route("/firewall/rules", methods=["POST"])
def add_firewall_rule():
    data = request.get_json(silent=True) or {}
    path = BASE / "rules.json"
    path.parent.mkdir(parents=True, exist_ok=True)

    rules_data = {"blocked_ips": [], "blocked_ports": []}
    if path.exists():
        try:
            with path.open("r", encoding="utf-8") as f:
                rules_data = json.load(f)
        except Exception:
            pass

    src = data.get("src")
    port = data.get("port")

    if src and src != "ANY" and src not in rules_data.get("blocked_ips", []):
        if "blocked_ips" not in rules_data:
            rules_data["blocked_ips"] = []
        rules_data["blocked_ips"].append(src)

    if port and port != "ANY":
        try:
            p_val = int(port)
            if "blocked_ports" not in rules_data:
                rules_data["blocked_ports"] = []
            if p_val not in rules_data["blocked_ports"]:
                rules_data["blocked_ports"].append(p_val)
        except ValueError:
            pass

    with path.open("w", encoding="utf-8") as f:
        json.dump(rules_data, f, indent=2)

    return jsonify({"status": "saved", "rules": rules_data})


@firewall_bp.route("/firewall/rules/delete", methods=["POST"])
def delete_firewall_rule():
    data = request.get_json(silent=True) or {}
    path = BASE / "rules.json"
    if not path.exists():
        return jsonify({"status": "error", "message": "File not found"}), 404

    try:
        with path.open("r", encoding="utf-8") as f:
            rules_data = json.load(f)
    except Exception:
        rules_data = {"blocked_ips": [], "blocked_ports": []}

    src = data.get("src")
    port = data.get("port")

    if src and src in rules_data.get("blocked_ips", []):
        rules_data["blocked_ips"].remove(src)
    if port:
        try:
            p_val = int(port)
            if p_val in rules_data.get("blocked_ports", []):
                rules_data["blocked_ports"].remove(p_val)
        except ValueError:
            pass

    with path.open("w", encoding="utf-8") as f:
        json.dump(rules_data, f, indent=2)

    return jsonify({"status": "deleted", "rules": rules_data})

