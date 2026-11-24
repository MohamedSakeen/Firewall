from flask import Blueprint, jsonify, request
<<<<<<< HEAD

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
=======
from engine.learning.feedback.feedback_manager import global_feedback_manager
from engine.models.governance import global_governance_manager
from engine.learning.poisoning.trusted_gate import TrustedLearningGate

learning_bp = Blueprint("learning", __name__, url_prefix="/api/learning")
trusted_gate = TrustedLearningGate()

@learning_bp.route("/baselines", methods=["GET"])
def get_baselines():
    baselines = [
        {
            "asset_ip": "10.0.0.10",
            "hostname": "web-prod-01",
            "role": "Web Server",
            "criticality": "HIGH",
            "confidence": 0.95,
            "sample_count": 1420,
            "normal_services": [80, 443, 22],
            "avg_pps": 145.2,
            "status": "STABLE_READY"
        },
        {
            "asset_ip": "10.0.0.20",
            "hostname": "db-core-01",
            "role": "Database",
            "criticality": "CRITICAL",
            "confidence": 0.98,
            "sample_count": 3100,
            "normal_services": [5432, 22],
            "avg_pps": 320.8,
            "status": "STABLE_READY"
        },
        {
            "asset_ip": "10.0.0.35",
            "hostname": "ws-admin-04",
            "role": "Admin Workstation",
            "criticality": "MEDIUM",
            "confidence": 0.82,
            "sample_count": 450,
            "normal_services": [80, 443, 3389],
            "avg_pps": 18.5,
            "status": "COLLECTING"
        }
    ]
    return jsonify({"baselines": baselines})

@learning_bp.route("/drift", methods=["GET"])
def get_drift():
    drift_records = [
        {
            "asset_ip": "10.0.0.10",
            "drift_type": "SERVICE_EXPANSION",
            "detected_at": 1700000200.0,
            "details": "New inbound service port 8080 observed consistently over 24h",
            "status": "CANDIDATE_BASELINE",
            "action_required": "CONFIRM_NETWORK_CHANGE"
        }
    ]
    return jsonify({"drift_events": drift_records})

@learning_bp.route("/trust-gate", methods=["POST"])
def evaluate_trust():
    data = request.get_json() or {}
    sample = {
        "anomaly_score": data.get("anomaly_score", 0.1),
        "threat_score": data.get("threat_score", 0),
        "is_quarantined": data.get("is_quarantined", False),
        "is_malicious": data.get("is_malicious", False),
        "behavior_stability": data.get("behavior_stability", 0.9)
    }
    is_trusted = trusted_gate.is_trusted_for_learning(sample)
    return jsonify({
        "sample": sample,
        "is_trusted": is_trusted,
        "gate_action": "LEARN" if is_trusted else "REJECT_FROM_BASELINE"
    })

@learning_bp.route("/feedback", methods=["POST"])
def post_feedback():
    data = request.get_json() or {}
    event_id = data.get("event_id", "EVT-UNKNOWN")
    label = data.get("label", "TRUE_POSITIVE")
    reason = data.get("reason", "")
    
    try:
        rec = global_feedback_manager.record_feedback(event_id, label, reason=reason)
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        return jsonify({"status": "SUCCESS", "record": rec})
    except ValueError as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 400

<<<<<<< HEAD

@learning_bp.route("/models", methods=["GET"])
def get_models():
    return jsonify({"models": global_governance_manager.list_models()})
=======
@learning_bp.route("/models", methods=["GET"])
def get_models():
    models = global_governance_manager.list_models()
    if not models:
        models = [
            {
                "model_id": "M-01",
                "name": "IsolationForestDetector",
                "version": "1.2.0",
                "status": "PRODUCTION",
                "dataset_version": "DS-2026-V4",
                "validation_metrics": {"accuracy": 0.965, "false_positive_rate": 0.008}
            }
        ]
    return jsonify({"models": models})
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
