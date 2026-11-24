from flask import Blueprint, jsonify, request
<<<<<<< HEAD

from api.services.live_store import global_live_store
from engine.flow.flow_tracker import global_flow_tracker
from engine.health.posture_engine import global_posture_engine
from engine.models.governance import global_governance_manager

posture_bp = Blueprint("posture", __name__, url_prefix="/api/posture")


def _percent(numerator, denominator):
    if not denominator:
        return 0.0
    return round(numerator / denominator * 100, 1)


@posture_bp.route("/score", methods=["GET"])
def get_posture_score():
    alerts = global_live_store.alerts_snapshot()
    blocks = global_live_store.blocks_snapshot()
    baselines = global_live_store.baselines()
    models = global_governance_manager.list_models()
    flow_count = len(global_flow_tracker.get_all_active_flows()) + len(global_flow_tracker.closed_flows)

    alert_scores = []
    for alert in alerts:
        score = alert.get("threat_score") or alert.get("score") or 0
        if isinstance(score, (int, float)) and not isinstance(score, bool):
            alert_scores.append(float(score))

    detection_score = _percent(len(alerts), flow_count)
    learning_score = _percent(
        sum(1 for baseline in baselines if baseline.get("status") == "STABLE_READY"),
        len(baselines),
    )
    response_score = _percent(len(blocks), len(alerts))
    asset_risk_score = round(max(0.0, 100.0 - max(alert_scores, default=0.0)), 1)
    model_health = _percent(
        sum(1 for model in models if model.get("status") in {"VALIDATED", "PRODUCTION"}),
        len(models),
    )

    return jsonify(global_posture_engine.calculate_posture_score(
        detection_score=detection_score,
        learning_score=learning_score,
        response_score=response_score,
        asset_risk_score=asset_risk_score,
        model_health=model_health,
    ))


@posture_bp.route("/replay", methods=["POST"])
def run_replay_scenario():
    data = request.get_json(silent=True) or {}
    scenario = data.get("scenario")
    if not scenario:
        return jsonify({"error": "scenario is required"}), 400
    return jsonify({"status": "NOT_RUN", "reason": "No replay dataset"})
=======
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
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
