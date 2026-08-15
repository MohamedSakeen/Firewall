import datetime

class ForensicTimelineBuilder:
    """
    Constructs chronological incident timeline linking alerts, scores, and response actions.
    """
    def build_timeline_for_incident(self, incident):
        events = []
        alerts = getattr(incident, "alerts", []) if not isinstance(incident, dict) else incident.get("alerts", [])

        for idx, alert in enumerate(alerts):
            ts = alert.get("timestamp", datetime.datetime.now().timestamp())
            dt_str = datetime.datetime.fromtimestamp(ts).strftime("%H:%M:%S")
            events.append({
                "timestamp": ts,
                "time_str": dt_str,
                "event_type": alert.get("type", "Security Alert"),
                "description": f"{alert.get('type', 'Alert')} from {alert.get('src_ip')} on port {alert.get('dst_port')}",
                "evidence_id": f"EVD-{idx + 1}"
            })

        # Sort chronologically
        events.sort(key=lambda x: x["timestamp"])
        return {
            "incident_id": getattr(incident, "incident_id", "INC-000"),
            "event_count": len(events),
            "timeline": events
        }

global_timeline_builder = ForensicTimelineBuilder()
