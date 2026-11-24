from flask import Blueprint, jsonify, request

from api.services.live_store import global_live_store

events_bp = Blueprint("events", __name__, url_prefix="/api/security-events")


@events_bp.route("", methods=["GET"])
def get_security_events():
    source = request.args.get("source")
    severity = request.args.get("severity")

    filtered = global_live_store.events_snapshot()
    if source:
        filtered = [event for event in filtered if event.get("source_category") == source.lower()]
    if severity:
        filtered = [event for event in filtered if str(event.get("severity", "")).upper() == severity.upper()]

    return jsonify({
        "total": len(filtered),
        "events": filtered,
    })


@events_bp.route("/<event_id>", methods=["GET"])
def get_event_by_id(event_id):
    for event in global_live_store.events_snapshot():
        if event.get("event_id") == event_id:
            return jsonify(event)
    return jsonify({"error": "Event not found"}), 404
