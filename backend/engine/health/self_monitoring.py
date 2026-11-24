class SelfMonitoringEngine:
    """
    Performs comprehensive subsystem health checks.
    Ensures deterministic stateful firewall functions even if ML/Learning engines fail.
    """
<<<<<<< HEAD
    def _connected_client_count(self):
        try:
            from api.api import socketio
            server = getattr(socketio, "server", None)
            manager = getattr(server, "manager", None)
            rooms = getattr(manager, "rooms", None)
            if not rooms:
                return 0
            return len({
                sid
                for namespace_rooms in rooms.values()
                for sids in namespace_rooms.values()
                for sid in sids
            })
        except Exception:
            return 0

    def run_health_check(self):
        from api.services.live_store import global_live_store, count_rule_entries
        from engine.flow.flow_tracker import global_flow_tracker
        from engine.IPS.ban_tracker import banned_ips

        packet_count = getattr(global_live_store, "packet_count", 0) or 0
        flow_count = global_flow_tracker.get_flow_count()
        rule_count = count_rule_entries()
        active_bans = len(banned_ips)
        baselines = global_live_store.baselines()
        drift = global_live_store.drift_snapshot()
        connected_clients = self._connected_client_count()

        baseline_confidence = None
        if baselines:
            confidences = [
                entry["confidence"]
                for entry in baselines
                if isinstance(entry, dict) and isinstance(entry.get("confidence"), (int, float))
            ]
            if confidences:
                baseline_confidence = round(sum(confidences) / len(confidences), 2)

        subsystems = {
            "Packet Capture": {
                "status": "IDLE" if packet_count == 0 else "HEALTHY",
                "packets_observed": packet_count,
            },
            "Stateful Firewall": {
                "status": "IDLE" if flow_count == 0 else "HEALTHY",
                "active_sessions": flow_count,
            },
            "IDS Engine": {
                "status": "HEALTHY" if rule_count > 0 else "IDLE",
                "active_rules": rule_count,
            },
            "IPS Engine": {
                "status": "HEALTHY" if active_bans > 0 else "IDLE",
                "active_bans": active_bans,
            },
            "Learning Engine": {
                "status": "HEALTHY" if baselines else "IDLE",
                "baseline_confidence": baseline_confidence,
                "baselines_observed": len(baselines),
            },
            "Anomaly Model": {
                "status": "DEGRADED" if drift else "HEALTHY",
                "drift_warning": bool(drift),
                "drift_events": len(drift),
            },
            "REST API": {
                "status": "UNKNOWN",
            },
            "WebSocket": {
                "status": "HEALTHY" if connected_clients > 0 else "IDLE",
                "connected_clients": connected_clients,
            },
        }

        statuses = [entry["status"] for entry in subsystems.values()]
        if "UNHEALTHY" in statuses:
            overall_status = "UNHEALTHY"
        elif "DEGRADED" in statuses:
            overall_status = "DEGRADED"
        elif packet_count == 0:
            overall_status = "IDLE"
        else:
            overall_status = "HEALTHY"
=======
    def run_health_check(self):
        subsystems = {
            "Packet Capture": {"status": "HEALTHY", "latency_ms": 1.2},
            "Stateful Firewall": {"status": "HEALTHY", "active_sessions": 142},
            "IDS Engine": {"status": "HEALTHY", "active_rules": 45},
            "IPS Engine": {"status": "HEALTHY", "active_bans": 3},
            "Learning Engine": {"status": "HEALTHY", "baseline_confidence": 0.92},
            "Anomaly Model": {"status": "HEALTHY", "drift_warning": False},
            "REST API": {"status": "HEALTHY", "port": 5000},
            "WebSocket": {"status": "HEALTHY", "connected_clients": 2}
        }

        overall_status = "HEALTHY"
        if any(v["status"] == "DEGRADED" for v in subsystems.values()):
            overall_status = "DEGRADED"
        if any(v["status"] == "UNHEALTHY" for v in subsystems.values()):
            overall_status = "UNHEALTHY"
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

        return {
            "overall_status": overall_status,
            "subsystems": subsystems
        }

global_self_monitoring = SelfMonitoringEngine()
