from flask import Blueprint, jsonify, request
from engine.intelligence.assets.asset_manager import global_asset_manager

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
        # Register standard default inventory for demonstration
        global_asset_manager.register_asset("10.0.0.10", hostname="web-prod-01", role="Web Server", criticality="HIGH", segment="DMZ", owner="DevOps")
        global_asset_manager.register_asset("10.0.0.20", hostname="db-core-01", role="Database", criticality="CRITICAL", segment="SECURE_LAN", owner="DBA Team")
        global_asset_manager.register_asset("10.0.0.35", hostname="ws-admin-04", role="Admin Workstation", criticality="MEDIUM", segment="CORPORATE", owner="SecOps")
        assets = global_asset_manager.list_all_assets()

    return jsonify({"assets": assets})
