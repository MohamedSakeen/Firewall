import time

class HoneypotDeceptionManager:
    """
    Manages isolated decoy services, decoy ports, and canary accounts.
    Interactions with decoys trigger high-confidence security alerts.
    """
    def __init__(self):
        self.decoys = {
            "DEC-21": {"ip": "10.0.0.99", "port": 21, "type": "DECOY_FTP", "status": "ACTIVE", "hits": 0},
            "DEC-23": {"ip": "10.0.0.99", "port": 23, "type": "DECOY_TELNET", "status": "ACTIVE", "hits": 0},
            "CANARY-ADMIN": {"ip": "10.0.0.10", "type": "CANARY_ACCOUNT", "name": "fake_admin_backup", "status": "ACTIVE", "hits": 0}
        }
        self.deception_events = []

    def evaluate_interaction(self, source_ip, destination_ip, destination_port=None, account_name=None):
        hit = None
        for d_id, decoy in self.decoys.items():
            if destination_port and decoy.get("port") == destination_port and decoy.get("ip") == destination_ip:
                hit = decoy
                break
            if account_name and decoy.get("type") == "CANARY_ACCOUNT" and decoy.get("name") == account_name:
                hit = decoy
                break

        if hit:
            hit["hits"] += 1
            evt = {
                "timestamp": time.time(),
                "time_str": time.strftime("%Y-%m-%d %H:%M:%S"),
                "source_ip": source_ip,
                "destination_ip": destination_ip,
                "decoy_type": hit["type"],
                "confidence": 0.99,
                "threat_score": 95,
                "is_honeypot": True,
                "recommended_action": "QUARANTINE"
            }
            self.deception_events.append(evt)
            return evt, True

        return None, False

    def list_decoys(self):
        return list(self.decoys.values())

global_deception_manager = HoneypotDeceptionManager()
