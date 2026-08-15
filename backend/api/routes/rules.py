import json
from pathlib import Path

from flask import Blueprint, jsonify, request

rules_bp = Blueprint("rules", __name__, url_prefix="/api")

BASE = Path(__file__).resolve().parent.parent.parent / "engine" / "rules"

VALID_TYPES = {"firewall", "ids", "ips", "scoring"}


def _resolve_path(rule_type):
    dir_map = {
        "firewall": BASE / "firewall",
        "ids": BASE / "IDS",
        "ips": BASE / "IPS",
        "scoring": BASE / "scoring",
    }
    return dir_map.get(rule_type)


@rules_bp.route("/rules/<rule_type>")
def get_rules(rule_type):
    if rule_type not in VALID_TYPES:
        return jsonify({"error": "invalid type"}), 400
    dir_path = _resolve_path(rule_type)
    if not dir_path or not dir_path.exists():
        return jsonify({})
    files = {}
    for p in sorted(dir_path.iterdir()):
        if p.suffix == ".json":
            try:
                with p.open("r", encoding="utf-8") as f:
                    files[p.name] = json.load(f)
            except Exception:
                files[p.name] = {"error": f"failed to parse {p.name}"}
    return jsonify(files)


@rules_bp.route("/rules/<rule_type>/<filename>", methods=["PUT"])
def save_rule(rule_type, filename):
    if rule_type not in VALID_TYPES:
        return jsonify({"error": "invalid type"}), 400
    if not filename.endswith(".json"):
        return jsonify({"error": "only .json files supported"}), 400
    dir_path = _resolve_path(rule_type)
    if not dir_path:
        return jsonify({"error": "invalid type"}), 400
    filepath = dir_path / filename
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "invalid JSON"}), 400
    with filepath.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return jsonify({"status": "saved", "file": filename})
