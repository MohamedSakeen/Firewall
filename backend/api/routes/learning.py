from flask import Blueprint, jsonify, request
from engine.learning.feedback.feedback_manager import global_feedback_manager
from engine.models.governance import global_governance_manager

learning_bp = Blueprint("learning", __name__, url_prefix="/api/learning")

@learning_bp.route("/baselines", methods=["GET"])
def get_baselines():
    baselines = [
        {
            "asset_ip": "10.0.0.10",
            "role": "Web Server",
            "criticality": "HIGH",
            "confidence": 0.95,
            "sample_count": 1420,
            "normal_services": [80, 443, 22]
        },
        {
            "asset_ip": "10.0.0.20",
            "role": "Database",
            "criticality": "CRITICAL",
            "confidence": 0.98,
            "sample_count": 3100,
            "normal_services": [5432, 22]
        }
    ]
    return jsonify({"baselines": baselines})

@learning_bp.route("/feedback", methods=["POST"])
def post_feedback():
    data = request.get_json() or {}
    event_id = data.get("event_id", "EVT-UNKNOWN")
    label = data.get("label", "TRUE_POSITIVE")
    reason = data.get("reason", "")
    
    try:
        rec = global_feedback_manager.record_feedback(event_id, label, reason=reason)
        return jsonify({"status": "SUCCESS", "record": rec})
    except ValueError as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 400

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
