from flask import Blueprint, jsonify, request
from engine.intelligence.assets.asset_manager import global_asset_manager
from engine.intelligence.assets.relationship_engine import global_asset_relationship_engine

assets_bp = Blueprint("assets", __name__, url_prefix="/api/assets")

@assets_bp.route("", methods=["GET", "POST"])
def manage_assets():
    if request.method == "POST":
        data = request.get_json() or {}
        ip = data.get("ip")
        if not ip:
            return jsonify({"status": "ERROR", "message": "IP address is required"}), 400
        
        asset = global_asset_manager.register_asset(
            ip=ip,
            hostname=data.get("hostname", ""),
            role=data.get("role", "Workstation"),
            criticality=data.get("criticality", "MEDIUM"),
            segment=data.get("segment", "INTERNAL"),
            owner=data.get("owner", "IT")
        )
        return jsonify({"status": "SUCCESS", "asset": asset})

    assets = global_asset_manager.list_all_assets()
    if not assets:
        global_asset_manager.register_asset("10.0.0.10", hostname="web-prod-01", role="Web Server", criticality="HIGH", segment="DMZ", owner="DevOps")
        global_asset_manager.register_asset("10.0.0.20", hostname="db-core-01", role="Database", criticality="CRITICAL", segment="SECURE_LAN", owner="DBA Team")
        global_asset_manager.register_asset("10.0.0.35", hostname="ws-admin-04", role="Admin Workstation", criticality="MEDIUM", segment="CORPORATE", owner="SecOps")
        assets = global_asset_manager.list_all_assets()

    return jsonify({"assets": assets})

@assets_bp.route("/relationships", methods=["GET", "POST"])
def manage_relationships():
    if request.method == "POST":
        data = request.get_json() or {}
        source = data.get("source")
        target = data.get("target")
        relationship_type = data.get("relationship_type", "communicates_with")
        evidence = data.get("evidence", [])

        if not source or not target:
            return jsonify({"status": "ERROR", "message": "source and target IPs are required"}), 400

        rel = global_asset_relationship_engine.add_relationship(source, target, relationship_type, evidence=evidence)
        return jsonify({"status": "SUCCESS", "relationship": rel})

    relationships = global_asset_relationship_engine.list_all_relationships()
    if not relationships:
        global_asset_relationship_engine.add_relationship("192.168.1.105", "10.0.0.10", "scanned", confidence=0.95, evidence="Port scan 80, 22")
        global_asset_relationship_engine.add_relationship("10.0.0.10", "10.0.0.20", "communicates_with", confidence=0.99, evidence="Internal SQL traffic")
        relationships = global_asset_relationship_engine.list_all_relationships()

    return jsonify({"relationships": relationships})
