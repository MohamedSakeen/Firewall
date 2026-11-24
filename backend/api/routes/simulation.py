<<<<<<< HEAD
import ipaddress

from flask import Blueprint, jsonify, request

from api.services.live_store import global_live_store
from engine.flow.flow_tracker import global_flow_tracker
from engine.intelligence.correlation.event_correlator import global_event_correlator
from engine.response.counterfactual import global_counterfactual_engine
from engine.response.simulator.policy_simulator import global_policy_simulator

simulation_bp = Blueprint("simulation", __name__, url_prefix="/api/simulation")


def _valid_ip(value):
    if not isinstance(value, str):
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


def _all_flows():
    with global_flow_tracker._lock:
        return [
            flow.to_dict()
            for flow in list(global_flow_tracker.active_flows.values()) + list(global_flow_tracker.closed_flows)
        ]


def _flow_history():
    flows = _all_flows()
    malicious_ips = {alert.get("src_ip") for alert in global_live_store.alerts_snapshot()}
    for flow in flows:
        flow["is_malicious"] = flow.get("src_ip") in malicious_ips
    return flows


def _find_incident(incident_id):
    return next(
        (
            incident
            for incident in global_event_correlator.active_incidents.values()
            if incident.incident_id == incident_id
        ),
        None,
    )


@simulation_bp.route("/simulate", methods=["POST"])
def simulate_policy():
    data = request.get_json(silent=True) or {}
    ip = _valid_ip(data.get("ip"))
    action = data.get("action")
    if not ip or not action:
        return jsonify({"error": "ip and action are required"}), 400

    port = data.get("port")
    if port is not None:
        try:
            port = int(port)
        except (TypeError, ValueError):
            return jsonify({"error": "valid port required"}), 400
        if not 1 <= port <= 65535:
            return jsonify({"error": "valid port required"}), 400

    proposed_rule = {"ip": ip, "port": port, "action": action}
    res = global_policy_simulator.simulate_rule(proposed_rule, _flow_history())
    return jsonify({"proposed_rule": proposed_rule, "simulation_result": res})


@simulation_bp.route("/counterfactual", methods=["POST"])
def counterfactual_analysis():
    data = request.get_json(silent=True) or {}
    incident_id = data.get("incident_id")
    if not incident_id:
        return jsonify({"error": "incident_id required"}), 400

    attacker_ip = _valid_ip(data.get("attacker_ip")) if data.get("attacker_ip") else None
    if not attacker_ip:
        incident = _find_incident(incident_id)
        if incident is None:
            return jsonify({"error": "incident not found"}), 404
        attacker_ip = incident.attacker_ip

    res = global_counterfactual_engine.compare_defense_options(
        {
            "incident_id": incident_id,
            "attacker_ip": attacker_ip,
        },
        flow_history=_flow_history(),
    )
=======
from flask import Blueprint, jsonify, request
from engine.response.simulator.policy_simulator import global_policy_simulator
from engine.response.counterfactual import global_counterfactual_engine

simulation_bp = Blueprint("simulation", __name__, url_prefix="/api/simulation")

@simulation_bp.route("/simulate", methods=["POST"])
def simulate_policy():
    data = request.get_json() or {}
    proposed_rule = {
        "ip": data.get("ip", "10.0.0.99"),
        "port": data.get("port"),
        "action": data.get("action", "BLOCK")
    }

    # Synthetic sample historical flow telemetry for simulation demonstration
    sample_flows = [
        {"src_ip": "10.0.0.99", "dst_port": 445, "is_malicious": True},
        {"src_ip": "10.0.0.99", "dst_port": 80, "is_malicious": True},
        {"src_ip": "10.0.0.15", "dst_port": 443, "is_malicious": False},
        {"src_ip": "10.0.0.25", "dst_port": 80, "is_malicious": False}
    ]

    res = global_policy_simulator.simulate_rule(proposed_rule, sample_flows)
    return jsonify({"proposed_rule": proposed_rule, "simulation_result": res})

@simulation_bp.route("/counterfactual", methods=["POST"])
def counterfactual_analysis():
    data = request.get_json() or {}
    incident = {
        "incident_id": data.get("incident_id", "INC-1001"),
        "attacker_ip": data.get("attacker_ip", "192.168.1.105")
    }
    res = global_counterfactual_engine.compare_defense_options(incident)
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
    return jsonify(res)
