import ipaddress

from flask import Blueprint, jsonify, request

from api.services.live_store import global_live_store
from engine.intelligence.assets.asset_manager import global_asset_manager
from engine.intelligence.assets.relationship_engine import global_asset_relationship_engine

assets_bp = Blueprint("assets", __name__, url_prefix="/api/assets")


def _valid_ip(value):
    if not isinstance(value, str):
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


@assets_bp.route("", methods=["GET", "POST"])
def manage_assets():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        ip = _valid_ip(data.get("ip"))
        if not ip:
            return jsonify({"status": "ERROR", "message": "valid IP address is required"}), 400

        asset = global_asset_manager.register_asset(
            ip=ip,
            hostname=data.get("hostname") or "",
            role=data.get("role", "Workstation"),
            criticality=data.get("criticality", "MEDIUM"),
            segment=data.get("segment", "INTERNAL"),
            owner=data.get("owner", "IT"),
        )
        return jsonify({"status": "SUCCESS", "asset": asset})

    baselines = {baseline.get("ip"): baseline for baseline in global_live_store.baselines()}
    assets = []
    for asset in global_asset_manager.list_all_assets():
        record = dict(asset)
        observation = baselines.get(asset.get("ip"), {})
        record["packet_count"] = observation.get("sample_count", 0)
        record["normal_services"] = observation.get("normal_services", [])
        record["bytes"] = observation.get("bytes", 0)
        record["first_seen"] = observation.get("first_seen")
        record["last_seen"] = observation.get("last_seen")
        assets.append(record)

    return jsonify({"assets": assets})


@assets_bp.route("/relationships", methods=["GET", "POST"])
def manage_relationships():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        source = _valid_ip(data.get("source"))
        target = _valid_ip(data.get("target"))
        relationship_type = data.get("relationship_type", "communicates_with")
        if not source or not target:
            return jsonify({"status": "ERROR", "message": "source and target IPs are required"}), 400
        if relationship_type not in global_asset_relationship_engine.VALID_RELATIONSHIPS:
            return jsonify({"status": "ERROR", "message": "invalid relationship_type"}), 400

        rel = global_asset_relationship_engine.add_relationship(
            source,
            target,
            relationship_type,
            confidence=data.get("confidence", 0.9),
            evidence=data.get("evidence", []),
        )
        return jsonify({"status": "SUCCESS", "relationship": rel})

    return jsonify({"relationships": global_asset_relationship_engine.list_all_relationships()})
