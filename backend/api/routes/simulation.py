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
    return jsonify(res)
