from flask import Blueprint, jsonify, request
from engine.response.policy.decision_engine import global_decision_engine
from engine.response.shadow.shadow_evaluator import global_shadow_evaluator
from engine.response.verification.response_verifier import global_response_verifier

response_bp = Blueprint("response", __name__, url_prefix="/api/responses")

@response_bp.route("/recommendations", methods=["GET", "POST"])
def get_recommendations():
    if request.method == "POST":
        data = request.get_json() or {}
        threat_score = data.get("threat_score", 75)
        criticality = data.get("criticality", "MEDIUM")
        is_honeypot = data.get("is_honeypot", False)
    else:
        threat_score = float(request.args.get("threat_score", 75))
        criticality = request.args.get("criticality", "MEDIUM")
        is_honeypot = request.args.get("is_honeypot", "false").lower() == "true"

    action, reason = global_decision_engine.evaluate_response(threat_score, asset_criticality=criticality, is_honeypot=is_honeypot)
    return jsonify({
        "threat_score": threat_score,
        "criticality": criticality,
        "is_honeypot": is_honeypot,
        "recommended_action": action,
        "reason": reason
    })

@response_bp.route("/shadow", methods=["GET", "POST"])
def shadow_rules():
    if request.method == "POST":
        data = request.get_json() or {}
        rule_id = data.get("rule_id", f"SHADOW-{int(request.date.timestamp()) if hasattr(request, 'date') else 101}")
        target_ip = data.get("target_ip", "192.168.1.100")
        target_port = data.get("target_port")
        action = data.get("action", "BLOCK")

        global_shadow_evaluator.add_shadow_rule(rule_id, target_ip, target_port, action)
        return jsonify({"status": "SUCCESS", "message": f"Shadow rule {rule_id} added", "rule": global_shadow_evaluator.shadow_rules.get(rule_id)})
    
    rules = list(global_shadow_evaluator.shadow_rules.values())
    if not rules:
        # Provide default mock shadow rule for SOC demo
        rules = [
            {
                "rule_id": "SHADOW-101",
                "target_ip": "192.168.1.155",
                "target_port": 22,
                "action": "BLOCK",
                "mode": "SHADOW",
                "matches": 42,
                "legitimate_matches": 0,
                "created_at": 1700000000.0
            }
        ]
    return jsonify({"shadow_rules": rules})

@response_bp.route("/shadow/promote", methods=["POST"])
def promote_shadow_rule():
    data = request.get_json() or {}
    rule_id = data.get("rule_id")
    if not rule_id:
        return jsonify({"status": "ERROR", "message": "rule_id is required"}), 400
    
    success = global_shadow_evaluator.promote_to_active(rule_id)
    if success:
        return jsonify({"status": "SUCCESS", "message": f"Rule {rule_id} promoted to ACTIVE mode"})
    return jsonify({"status": "ERROR", "message": f"Rule {rule_id} not found"}), 404

@response_bp.route("/verify", methods=["POST"])
def verify_response():
    data = request.get_json() or {}
    pps_before = data.get("pps_before", 850)
    pps_after = data.get("pps_after", 12)
    min_reduction = data.get("min_reduction_pct", 90.0)

    result = global_response_verifier.verify_effectiveness(pps_before, pps_after, min_reduction_pct=min_reduction)
    return jsonify(result)
