from flask import Blueprint, jsonify, request
from engine.intelligence.correlation.event_correlator import global_event_correlator
from engine.intelligence.attack_graph.graph_builder import global_graph_builder
from engine.forensics.timeline_builder import global_timeline_builder

incidents_bp = Blueprint("incidents", __name__, url_prefix="/api/incidents")

@incidents_bp.route("", methods=["GET"])
def get_incidents():
    incidents = global_event_correlator.get_all_incidents()
    if not incidents:
        # Mock sample incident for SOC demonstration when idle
        incidents = [
            {
                "incident_id": "INC-1001",
                "attacker_ip": "192.168.1.105",
                "target_assets": ["10.0.0.10", "10.0.0.20"],
                "alert_count": 5,
                "threat_score": 88,
                "current_stage": "Credential Attack",
                "status": "OPEN",
                "created_at": 1700000000.0,
                "updated_at": 1700000300.0
            }
        ]
    return jsonify({"incidents": incidents})

@incidents_bp.route("/<incident_id>/graph", methods=["GET"])
def get_incident_graph(incident_id):
    incidents = global_event_correlator.active_incidents
    if incident_id in incidents:
        graph = global_graph_builder.build_graph_for_incident(incidents[incident_id])
    else:
        # Mock fallback graph
        graph = {
            "incident_id": incident_id,
            "nodes": [
                {"id": "att-192.168.1.105", "label": "Attacker (192.168.1.105)", "type": "ATTACKER"},
                {"id": "stage-cred", "label": "Stage: Credential Attack", "type": "STAGE"},
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
