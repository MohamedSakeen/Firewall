from flask import Blueprint, jsonify, request

from engine.forensics.timeline_builder import global_timeline_builder
from engine.intelligence.attack_graph.graph_builder import global_graph_builder
from engine.intelligence.correlation.event_correlator import global_event_correlator
from engine.intelligence.prediction.prediction_engine import global_prediction_shadow_engine
from engine.intelligence.priority_engine import global_priority_engine

incidents_bp = Blueprint("incidents", __name__, url_prefix="/api/incidents")


def _find_incident(incident_id):
    return next(
        (
            incident
            for incident in global_event_correlator.active_incidents.values()
            if incident.incident_id == incident_id
        ),
        None,
    )


@incidents_bp.route("", methods=["GET"])
def get_incidents():
    return jsonify({"incidents": global_event_correlator.get_all_incidents()})


@incidents_bp.route("/priority", methods=["GET", "POST"])
def get_incident_priorities():
    priorities = []

    for inc in global_event_correlator.get_all_incidents():
        response_result = inc.get("response_result") or {}
        has_failed_response = (
            str(response_result.get("status", response_result.get("outcome", ""))).upper()
            in {"FAILED", "RESPONSE_FAILED"}
            if isinstance(response_result, dict)
            else False
        )
        has_lateral_movement = (
            str(inc.get("current_stage", "")).upper().replace(" ", "_") == "LATERAL_MOVEMENT"
        )
        priority = global_priority_engine.calculate_priority(
            inc,
            has_failed_response=has_failed_response,
            has_lateral_movement=has_lateral_movement,
        )
        priorities.append({
            "incident_id": inc.get("incident_id"),
            "priority": priority,
        })

    return jsonify({"priorities": priorities})


@incidents_bp.route("/<incident_id>/graph", methods=["GET"])
def get_incident_graph(incident_id):
    incident = _find_incident(incident_id)
    if incident is None:
        return jsonify({"error": "Incident not found"}), 404
    return jsonify(global_graph_builder.build_graph_for_incident(incident))


@incidents_bp.route("/<incident_id>/timeline", methods=["GET"])
def get_incident_timeline(incident_id):
    incident = _find_incident(incident_id)
    if incident is None:
        return jsonify({"error": "Incident not found"}), 404
    return jsonify(global_timeline_builder.build_timeline_for_incident(incident))


@incidents_bp.route("/<incident_id>/predict", methods=["GET", "POST"])
def predict_incident_next_stage(incident_id):
    incident = _find_incident(incident_id)
    data = request.get_json(silent=True) or {} if request.method == "POST" else {}
    current_stage = data.get("current_stage") or request.args.get("stage")
    if current_stage is None and incident is not None:
        current_stage = incident.current_stage
    if not current_stage:
        return jsonify({"error": "Incident not found and current_stage not provided"}), 404

    current_stage = str(current_stage).upper().replace(" ", "_")
    prediction = global_prediction_shadow_engine.predict_next_stage_shadow(incident_id, current_stage)
    metrics = global_prediction_shadow_engine.get_metrics()
    return jsonify({
        "prediction": prediction,
        "metrics": metrics,
    })
