from flask import Blueprint, jsonify, request

from api.services.live_store import global_live_store
from engine.intelligence.assets.asset_manager import global_asset_manager
from engine.learning.feedback.feedback_manager import global_feedback_manager
from engine.learning.security.trust_gate import global_trust_gate
from engine.models.governance import global_governance_manager

learning_bp = Blueprint("learning", __name__, url_prefix="/api/learning")

TRUST_FIELDS = ("anomaly_score", "threat_score", "is_quarantined", "is_malicious", "behavior_stability")
ASSET_FIELDS = ("hostname", "role", "criticality", "segment", "owner")


@learning_bp.route("/baselines", methods=["GET"])
def get_baselines():
    metadata = {asset.get("ip"): asset for asset in global_asset_manager.list_all_assets()}
    baselines = []

    for baseline in global_live_store.baselines():
        record = dict(baseline)
        asset = metadata.get(baseline.get("ip"), {})
        record["asset_ip"] = baseline.get("ip")
        for field in ASSET_FIELDS:
            record[field] = asset.get(field, "")
        baselines.append(record)

    return jsonify({"baselines": baselines})


@learning_bp.route("/drift", methods=["GET"])
def get_drift():
    return jsonify({"drift_events": global_live_store.drift_snapshot()})


@learning_bp.route("/trust-gate", methods=["POST"])
def evaluate_trust():
    data = request.get_json(silent=True) or {}
    missing = [field for field in TRUST_FIELDS if field not in data]
    if missing:
        return jsonify({"status": "ERROR", "message": "missing fields: " + ", ".join(missing)}), 400

    sample = {field: data[field] for field in TRUST_FIELDS}
    for field in ("anomaly_score", "threat_score", "behavior_stability"):
        if isinstance(sample[field], bool) or not isinstance(sample[field], (int, float)):
            return jsonify({"status": "ERROR", "message": f"invalid {field}"}), 400
    for field in ("is_quarantined", "is_malicious"):
        if not isinstance(sample[field], bool):
            return jsonify({"status": "ERROR", "message": f"invalid {field}"}), 400

    observation = {
        "anomaly_score": sample["anomaly_score"],
        "threat_score": sample["threat_score"],
        "is_quarantined": sample["is_quarantined"],
        "is_known_malicious": sample["is_malicious"],
        "behavior_stability": sample["behavior_stability"],
    }
    result = global_trust_gate.evaluate_observation(observation)
    return jsonify({
        "sample": sample,
        "is_trusted": result["learn_allowed"],
        "trust_level": result["trust_level"],
        "gate_action": "LEARN" if result["learn_allowed"] else "REJECT_FROM_BASELINE",
        "reason": result["reason"],
    })


@learning_bp.route("/feedback", methods=["POST"])
def post_feedback():
    data = request.get_json(silent=True) or {}
    event_id = data.get("event_id")
    label = data.get("label")
    if not event_id or not label:
        return jsonify({"status": "ERROR", "message": "event_id and label are required"}), 400

    try:
        rec = global_feedback_manager.record_feedback(event_id, label, reason=data.get("reason", ""))
        return jsonify({"status": "SUCCESS", "record": rec})
    except ValueError as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 400


@learning_bp.route("/models", methods=["GET"])
def get_models():
    return jsonify({"models": global_governance_manager.list_models()})
