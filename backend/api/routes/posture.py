from flask import Blueprint, jsonify, request
from engine.health.posture_engine import global_posture_engine
from engine.forensics.replay_lab import global_replay_lab

posture_bp = Blueprint("posture", __name__, url_prefix="/api/posture")

@posture_bp.route("/score", methods=["GET"])
def get_posture_score():
    res = global_posture_engine.calculate_posture_score()
    return jsonify(res)

@posture_bp.route("/replay", methods=["POST"])
def run_replay_scenario():
    data = request.get_json() or {}
    scenario = data.get("scenario", "port_scan")
    res = global_replay_lab.run_scenario(scenario)
    return jsonify(res)
