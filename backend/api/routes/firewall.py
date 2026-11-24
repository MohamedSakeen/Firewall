import ipaddress
import json
import logging
import os
import tempfile
from pathlib import Path

from flask import Blueprint, jsonify, request

firewall_bp = Blueprint("firewall", __name__, url_prefix="/api")

BASE = Path(__file__).resolve().parent.parent.parent / "engine" / "rules" / "firewall"
logger = logging.getLogger(__name__)


def _atomic_write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def _validate_src(value):
    if isinstance(value, bool) or not isinstance(value, str):
        return None
    value = value.strip()
    if not value:
        return None
    if value.upper() == "ANY":
        return "ANY"
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        try:
            return str(ipaddress.ip_network(value, strict=False))
        except ValueError:
            return None


def _validate_port(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        port = value
    elif isinstance(value, str):
        value = value.strip()
        if value.upper() == "ANY":
            return "ANY"
        if not value.isdigit():
            return None
        port = int(value)
    else:
        return None
    return port if 1 <= port <= 65535 else None


def _request_rule(data):
    if not isinstance(data, dict) or set(data) - {"src", "port"} or not data:
        return None
    result = {}
    if "src" in data:
        src = _validate_src(data["src"])
        if src is None:
            return None
        result["src"] = src
    if "port" in data:
        port = _validate_port(data["port"])
        if port is None:
            return None
        result["port"] = port
    return result


def _load_rules(path):
    if not path.exists():
        return {"blocked_ips": [], "blocked_ports": []}
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("rule file has an unexpected shape")
    for key in ("blocked_ips", "blocked_ports"):
        if not isinstance(data.get(key), list):
            data[key] = []
    return data


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
        logger.warning("could not read firewall rules")
        return jsonify({"blocked_ips": [], "blocked_ports": []})


@firewall_bp.route("/firewall/rules", methods=["POST"])
def add_firewall_rule():
    rule = _request_rule(request.get_json(silent=True))
    if rule is None:
        return jsonify({"error": "invalid rule"}), 400

    path = BASE / "rules.json"
    try:
        rules_data = _load_rules(path)
    except Exception:
        logger.warning("could not read firewall rules for update")
        return jsonify({"error": "unable to update rules"}), 500

    src = rule.get("src")
    port = rule.get("port")
    if src is not None and src != "ANY" and src not in rules_data["blocked_ips"]:
        rules_data["blocked_ips"].append(src)
    if port is not None and port != "ANY" and port not in rules_data["blocked_ports"]:
        rules_data["blocked_ports"].append(port)

    try:
        _atomic_write_json(path, rules_data)
    except Exception:
        logger.exception("could not write firewall rules")
        return jsonify({"error": "unable to save rules"}), 500

    return jsonify({"status": "saved", "rules": rules_data})


@firewall_bp.route("/firewall/rules/delete", methods=["POST"])
def delete_firewall_rule():
    rule = _request_rule(request.get_json(silent=True))
    if rule is None:
        return jsonify({"error": "invalid rule"}), 400

    path = BASE / "rules.json"
    if not path.exists():
        return jsonify({"status": "error", "message": "File not found"}), 404
    try:
        rules_data = _load_rules(path)
    except Exception:
        logger.warning("could not read firewall rules for update")
        return jsonify({"error": "unable to update rules"}), 500

    src = rule.get("src")
    port = rule.get("port")
    if src is not None and src in rules_data["blocked_ips"]:
        rules_data["blocked_ips"].remove(src)
    if port is not None and port in rules_data["blocked_ports"]:
        rules_data["blocked_ports"].remove(port)

    try:
        _atomic_write_json(path, rules_data)
    except Exception:
        logger.exception("could not write firewall rules")
        return jsonify({"error": "unable to save rules"}), 500

    return jsonify({"status": "deleted", "rules": rules_data})
