from flask import Blueprint, jsonify, request
from engine.detection.anomaly.unified_event import UnifiedSecurityEvent, EventEvidenceBuilder

events_bp = Blueprint("events", __name__, url_prefix="/api/security-events")

# In-memory store of recent unified security events for demonstration/SOC feed
_sample_events = [
    UnifiedSecurityEvent(
        event_type="SSH_BRUTE_FORCE_ANOMALY",
        source_ip="192.168.1.105",
        destination_ip="10.0.0.10",
        source_port=54210,
        destination_port=22,
        protocol="TCP",
        asset_id="ASSET-10.0.0.10",
        detector="StatisticalAnomalyEngine",
        severity="HIGH",
        anomaly_score=0.88,
        threat_score=85,
        confidence=0.92,
        evidence=["SSH connection frequency 11.4x above baseline", "73 failed auth attempts/min", "IDS detected port scan prior to attack"],
        source_category="anomaly",
        recommended_action="TEMPORARY_BLOCK"
    ).to_dict(),
    UnifiedSecurityEvent(
        event_type="SYN_FLOOD_SPIKE",
        source_ip="192.168.1.180",
        destination_ip="10.0.0.20",
        source_port=61200,
        destination_port=80,
        protocol="TCP",
        asset_id="ASSET-10.0.0.20",
        detector="FloodDetector",
        severity="CRITICAL",
        anomaly_score=0.95,
        threat_score=92,
        confidence=0.96,
        evidence=["SYN ratio 98% of total volume", "Packet rate 1,400 pps"],
        source_category="ids",
        recommended_action="QUARANTINE"
    ).to_dict()
]

@events_bp.route("", methods=["GET"])
def get_security_events():
    source = request.args.get("source")
    severity = request.args.get("severity")
    
    filtered = _sample_events
    if source:
        filtered = [e for e in filtered if e.get("source_category") == source.lower()]
    if severity:
        filtered = [e for e in filtered if e.get("severity") == severity.upper()]

    return jsonify({
        "total": len(filtered),
        "events": filtered
    })

@events_bp.route("/<event_id>", methods=["GET"])
def get_event_by_id(event_id):
    for e in _sample_events:
        if e.get("event_id") == event_id:
            return jsonify(e)
    return jsonify({"error": "Event not found"}), 404
