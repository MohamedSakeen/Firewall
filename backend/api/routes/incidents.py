from flask import Blueprint, jsonify, request
from engine.intelligence.correlation.event_correlator import global_event_correlator
from engine.intelligence.attack_graph.graph_builder import global_graph_builder
from engine.forensics.timeline_builder import global_timeline_builder
from engine.intelligence.prediction.prediction_engine import global_prediction_shadow_engine
from engine.intelligence.priority_engine import global_priority_engine
from engine.intelligence.attack_stage.transition_engine import global_transition_engine

incidents_bp = Blueprint("incidents", __name__, url_prefix="/api/incidents")

@incidents_bp.route("", methods=["GET"])
def get_incidents():
    incidents = global_event_correlator.get_all_incidents()
    if not incidents:
        incidents = [
            {
                "incident_id": "INC-1001",
                "attacker_ip": "192.168.1.105",
                "target_assets": ["10.0.0.10", "10.0.0.20"],
                "alert_count": 5,
                "threat_score": 88,
                "severity": "HIGH",
                "current_stage": "CREDENTIAL_ATTACK",
                "status": "OPEN",
                "created_at": 1700000000.0,
                "updated_at": 1700000300.0,
                "attack_story": [
                    "1. Source entity (192.168.1.105) initiated network probes.",
                    "2. Activity detected: Port Scan.",
                    "3. Activity detected: SSH Authentication Failure.",
                    "4. Threat score evaluated at 88 (HIGH severity).",
                    "5. Recommended mitigation: TEMPORARY_BLOCK."
                ]
            }
        ]
    return jsonify({"incidents": incidents})

@incidents_bp.route("/priority", methods=["GET", "POST"])
def get_incident_priorities():
    incidents = global_event_correlator.get_all_incidents()
    priorities = []

    if not incidents:
        incidents = [
            {"incident_id": "INC-1001", "attacker_ip": "192.168.1.105", "threat_score": 88, "severity": "HIGH", "current_stage": "CREDENTIAL_ATTACK"}
        ]

    for inc in incidents:
        p_res = global_priority_engine.calculate_priority(inc, has_failed_response=False, has_lateral_movement=True)
        priorities.append({
            "incident_id": inc.get("incident_id"),
            "priority": p_res
        })

    return jsonify({"priorities": priorities})

@incidents_bp.route("/<incident_id>/graph", methods=["GET"])
def get_incident_graph(incident_id):
    incidents = global_event_correlator.active_incidents
    if incident_id in incidents:
        graph = global_graph_builder.build_graph_for_incident(incidents[incident_id])
    else:
        graph = {
            "incident_id": incident_id,
            "nodes": [
                {"id": "att-192.168.1.105", "label": "Attacker (192.168.1.105)", "type": "ATTACKER"},
                {"id": "stage-cred", "label": "Stage: CREDENTIAL_ATTACK", "type": "STAGE"},
                {"id": "asset-10.0.0.10", "label": "Web Server (10.0.0.10)", "type": "ASSET"},
                {"id": "asset-10.0.0.20", "label": "Database (10.0.0.20)", "type": "ASSET"}
            ],
            "edges": [
                {"source": "att-192.168.1.105", "target": "stage-cred", "label": "IN_STAGE"},
                {"source": "att-192.168.1.105", "target": "asset-10.0.0.10", "label": "TARGETS"},
                {"source": "att-192.168.1.105", "target": "asset-10.0.0.20", "label": "TARGETS"}
            ]
        }
    return jsonify(graph)

@incidents_bp.route("/<incident_id>/timeline", methods=["GET"])
def get_incident_timeline(incident_id):
    incidents = global_event_correlator.active_incidents
    if incident_id in incidents:
        timeline = global_timeline_builder.build_timeline_for_incident(incidents[incident_id])
    else:
        timeline = {
            "incident_id": incident_id,
            "event_count": 3,
            "timeline": [
                {"timestamp": 1700000000.0, "time_str": "19:30:00", "event_type": "Port Scan", "description": "Port scan detected from 192.168.1.105 on port 80", "evidence_id": "EVD-1"},
                {"timestamp": 1700000120.0, "time_str": "19:32:00", "event_type": "SSH Brute Force", "description": "Rapid credential failures on port 22", "evidence_id": "EVD-2"},
                {"timestamp": 1700000300.0, "time_str": "19:35:00", "event_type": "Threat Escalation", "description": "Threat score 88 -> Temporary block initiated", "evidence_id": "EVD-3"}
            ]
        }
    return jsonify(timeline)

@incidents_bp.route("/<incident_id>/predict", methods=["GET", "POST"])
def predict_incident_next_stage(incident_id):
    current_stage = request.args.get("stage", "CREDENTIAL_ATTACK")
    if request.method == "POST":
        data = request.get_json() or {}
        current_stage = data.get("current_stage", current_stage)

    prediction = global_prediction_shadow_engine.predict_next_stage_shadow(incident_id, current_stage)
    metrics = global_prediction_shadow_engine.get_metrics()
    return jsonify({
        "prediction": prediction,
        "metrics": metrics
    })
