import ipaddress
import re

from flask import Blueprint, jsonify, request
from flask_login import current_user

from api.services.live_store import global_live_store
from auth.db import list_response_actions
from engine.deception.honeypot_manager import global_deception_manager
from engine.flow.flow_tracker import global_flow_tracker
from engine.IPS.response_controller import global_response_controller
from engine.intelligence.correlation.event_correlator import global_event_correlator
from engine.response.counterfactual import global_counterfactual_engine
from engine.response.policy.decision_engine import global_decision_engine
from engine.response.shadow.shadow_evaluator import global_shadow_evaluator
from engine.response.verification.response_verifier import global_response_verifier

response_bp = Blueprint("response", __name__, url_prefix="/api/responses")


def _valid_ip(value):
    if not isinstance(value, str):
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


def _valid_action_id(value):
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if not re.fullmatch(r"[A-Za-z0-9_.:-]{1,128}", cleaned):
        return None
    return cleaned


def _decision_reason(data):
    data = data if isinstance(data, dict) else {}
    if set(data) - {"reason"}:
        return None, "unknown fields are not allowed"
    reason = data.get("reason")
    if reason is None:
        return "", None
    if not isinstance(reason, str):
        return None, "reason must be a string"
    cleaned = " ".join(reason.split())
    if len(cleaned) > 200:
        return None, "reason must be at most 200 characters"
    return cleaned, None


def _find_incident(incident_id):
    return next(
        (
            incident
            for incident in global_event_correlator.active_incidents.values()
            if incident.incident_id == incident_id
        ),
        None,
    )


def _flow_history():
    with global_flow_tracker._lock:
        flows = [
            flow.to_dict()
            for flow in list(global_flow_tracker.active_flows.values()) + list(global_flow_tracker.closed_flows)
        ]
    malicious_ips = {alert.get("src_ip") for alert in global_live_store.alerts_snapshot()}
    for flow in flows:
        flow["is_malicious"] = flow.get("src_ip") in malicious_ips
    return flows


def _resolve_incident(data):
    incident_id = data.get("incident_id")
    if not incident_id:
        return None, (jsonify({"error": "incident_id required"}), 400)

    attacker_ip = _valid_ip(data.get("attacker_ip")) if data.get("attacker_ip") else None
    if attacker_ip:
        return {"incident_id": incident_id, "attacker_ip": attacker_ip}, None

    incident = _find_incident(incident_id)
    if incident is None:
        return None, (jsonify({"error": "incident not found"}), 404)
    return {"incident_id": incident.incident_id, "attacker_ip": incident.attacker_ip}, None


@response_bp.route("/recommendations", methods=["GET", "POST"])
def get_recommendations():
    data = request.get_json(silent=True) or {} if request.method == "POST" else request.args.to_dict()
    threat_score = data.get("threat_score")
    criticality = data.get("criticality")
    is_honeypot = data.get("is_honeypot")
    if threat_score is None or criticality is None or is_honeypot is None:
        return jsonify({"error": "threat_score, criticality and is_honeypot are required"}), 400

    if isinstance(threat_score, bool):
        return jsonify({"error": "valid threat_score required"}), 400
    try:
        threat_score = float(threat_score)
    except (TypeError, ValueError):
        return jsonify({"error": "valid threat_score required"}), 400

    if isinstance(is_honeypot, str):
        if is_honeypot.lower() not in ("true", "false"):
            return jsonify({"error": "valid is_honeypot required"}), 400
        is_honeypot = is_honeypot.lower() == "true"
    elif not isinstance(is_honeypot, bool):
        return jsonify({"error": "valid is_honeypot required"}), 400

    action, reason = global_decision_engine.evaluate_response(
        threat_score, asset_criticality=criticality, is_honeypot=is_honeypot
    )
    return jsonify({
        "threat_score": threat_score,
        "criticality": criticality,
        "is_honeypot": is_honeypot,
        "recommended_action": action,
        "reason": reason,
    })


@response_bp.route("/counterfactual", methods=["POST"])
def counterfactual_analysis():
    data = request.get_json(silent=True) or {}
    incident, error = _resolve_incident(data)
    if error is not None:
        return error
    return jsonify(global_counterfactual_engine.compare_defense_options(incident, flow_history=_flow_history()))


@response_bp.route("/deception", methods=["GET"])
def get_deception_decoys():
    return jsonify({
        "decoys": global_deception_manager.list_decoys(),
        "events": global_deception_manager.deception_events,
    })


@response_bp.route("/shadow", methods=["GET", "POST"])
def shadow_rules():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        rule_id = data.get("rule_id")
        target_ip = _valid_ip(data.get("target_ip"))
        target_port = data.get("target_port")
        action = data.get("action")
        if not rule_id or not target_ip or target_port is None or not action:
            return jsonify({"error": "rule_id, target_ip, target_port and action are required"}), 400
        try:
            target_port = int(target_port)
        except (TypeError, ValueError):
            return jsonify({"error": "valid target_port required"}), 400
        if not 1 <= target_port <= 65535:
            return jsonify({"error": "valid target_port required"}), 400

        global_shadow_evaluator.add_shadow_rule(rule_id, target_ip, target_port, action)
        return jsonify({
            "status": "SUCCESS",
            "message": f"Shadow rule {rule_id} added",
            "rule": global_shadow_evaluator.shadow_rules.get(rule_id),
        })

    return jsonify({"shadow_rules": list(global_shadow_evaluator.shadow_rules.values())})


@response_bp.route("/shadow/promote", methods=["POST"])
def promote_shadow_rule():
    data = request.get_json(silent=True) or {}
    rule_id = data.get("rule_id")
    if not rule_id:
        return jsonify({"status": "ERROR", "message": "rule_id is required"}), 400

    success = global_shadow_evaluator.promote_to_active(rule_id)
    if success:
        return jsonify({"status": "SUCCESS", "message": f"Rule {rule_id} promoted to ACTIVE mode"})
    return jsonify({"status": "ERROR", "message": f"Rule {rule_id} not found"}), 404


@response_bp.route("/verify", methods=["POST"])
def verify_response():
    data = request.get_json(silent=True) or {}
    values = {}
    for field in ("pps_before", "pps_after", "min_reduction_pct"):
        raw = data.get(field)
        if raw is None or isinstance(raw, bool):
            return jsonify({"error": f"{field} is required"}), 400
        try:
            values[field] = float(raw)
        except (TypeError, ValueError):
            return jsonify({"error": f"valid {field} required"}), 400

    return jsonify(global_response_verifier.verify_effectiveness(**values))


@response_bp.route("/approvals", methods=["GET"])
def list_approvals():
    return jsonify({"approvals": global_response_controller.list_pending_actions()})


@response_bp.route("/approvals/<action_id>/approve", methods=["POST"])
def approve_action(action_id):
    identifier = _valid_action_id(action_id)
    if identifier is None:
        return jsonify({"error": "invalid action_id"}), 400
    reason, error = _decision_reason(request.get_json(silent=True) or {})
    if error is not None:
        return jsonify({"error": error}), 400

    result = global_response_controller.approve(
        identifier, actor=current_user.username, reason=reason
    )
    if result["status"] == "NOT_FOUND":
        return jsonify({"error": "pending action not found"}), 404
    if result["status"] == "REJECTED":
        return jsonify(result), 409
    if result["status"] == "FAILED":
        return jsonify(result), 503
    return jsonify(result)


@response_bp.route("/approvals/<action_id>/reject", methods=["POST"])
def reject_action(action_id):
    identifier = _valid_action_id(action_id)
    if identifier is None:
        return jsonify({"error": "invalid action_id"}), 400
    reason, error = _decision_reason(request.get_json(silent=True) or {})
    if error is not None:
        return jsonify({"error": error}), 400

    result = global_response_controller.reject(
        identifier, actor=current_user.username, reason=reason
    )
    if result["status"] == "NOT_FOUND":
        return jsonify({"error": "pending action not found"}), 404
    return jsonify(result)


@response_bp.route("/actions", methods=["GET"])
def list_actions():
    raw_limit = request.args.get("limit", "100")
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return jsonify({"error": "limit must be a positive integer"}), 400
    if not 1 <= limit <= 1000:
        return jsonify({"error": "limit must be between 1 and 1000"}), 400
    return jsonify({"actions": list_response_actions(limit=limit)})
