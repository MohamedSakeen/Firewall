from flask import Blueprint, jsonify, request
from engine.response.policy.autonomy_engine import global_autonomy_engine
from engine.response.rollback_manager import global_rollback_manager
from api.services.websocket_service import socketio

autonomy_bp = Blueprint("autonomy", __name__, url_prefix="/api/autonomy")

@autonomy_bp.route("/status", methods=["GET"])
def get_autonomy_status():
    return jsonify({
        "current_level": global_autonomy_engine.current_level,
        "kill_switch_active": global_autonomy_engine.kill_switch_active,
        "kill_switch_reason": global_autonomy_engine.kill_switch_reason,
        "active_rollback_actions": len(global_rollback_manager.active_actions)
    })

@autonomy_bp.route("/level", methods=["POST"])
def set_autonomy_level():
    data = request.get_json() or {}
    level = data.get("level", "LEVEL_1_RECOMMEND")
    success = global_autonomy_engine.set_autonomy_level(level)
    if success:
        return jsonify({"status": "SUCCESS", "current_level": global_autonomy_engine.current_level})
    return jsonify({"status": "ERROR", "message": f"Invalid autonomy level: {level}"}), 400

@autonomy_bp.route("/kill-switch", methods=["POST"])
def trigger_kill_switch():
    data = request.get_json() or {}
    reason = data.get("reason", "Administrator emergency kill-switch initiated")
    res = global_autonomy_engine.trigger_kill_switch(reason=reason)
    socketio.emit("autonomy.kill_switch_triggered", res)
    return jsonify(res)

@autonomy_bp.route("/reset", methods=["POST"])
def reset_kill_switch():
    res = global_autonomy_engine.reset_kill_switch()
    socketio.emit("autonomy.reset", res)
    return jsonify(res)

@autonomy_bp.route("/rollback", methods=["POST"])
def manual_rollback():
    data = request.get_json() or {}
    action_id = data.get("action_id")
    if not action_id:
        return jsonify({"status": "ERROR", "message": "action_id is required"}), 400

    success, record = global_rollback_manager.execute_manual_rollback(action_id)
    if success:
        return jsonify({"status": "SUCCESS", "record": record})
    return jsonify({"status": "ERROR", "message": "Action not found"}), 404
