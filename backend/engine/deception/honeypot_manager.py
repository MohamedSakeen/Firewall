import time

class HoneypotDeceptionManager:
    """
    Manages isolated decoy services, decoy ports, and canary accounts.
    Interactions with decoys trigger high-confidence security alerts.
    """
    def __init__(self, default_action="QUARANTINE", scoring_provider=None):
        self.decoys = {}
        self.deception_events = []
        self.default_action = default_action
        self.scoring_provider = scoring_provider
        self._decoy_counter = 0

    def add_decoy(self, ip, port=None, decoy_type="DECOY_SERVICE", name=None, decoy_id=None, action=None, metadata=None):
        self._decoy_counter += 1
        identifier = decoy_id or f"DEC-{self._decoy_counter:03d}"
        decoy = {
            "ip": ip,
            "port": port,
            "type": decoy_type,
            "status": "ACTIVE",
            "hits": 0,
            "action": action or self.default_action
        }
        if name is not None:
            decoy["name"] = name
        if metadata:
            decoy.update(metadata)
        self.decoys[identifier] = decoy
        return decoy

    def evaluate_interaction(self, source_ip, destination_ip, destination_port=None, account_name=None, confidence=None, threat_score=None):
        hit = None
        for decoy in self.decoys.values():
            if destination_port is not None and decoy.get("port") == destination_port and decoy.get("ip") == destination_ip:
                hit = decoy
                break
            if account_name and decoy.get("type") == "CANARY_ACCOUNT" and decoy.get("name") == account_name:
                hit = decoy
                break

        if hit:
            hit["hits"] += 1
            if self.scoring_provider is not None and (confidence is None or threat_score is None):
                try:
                    scores = self.scoring_provider(
                        source_ip=source_ip,
                        destination_ip=destination_ip,
                        destination_port=destination_port,
                        account_name=account_name
                    ) or {}
                except Exception:
                    scores = {}
                if confidence is None:
                    confidence = scores.get("confidence")
                if threat_score is None:
                    threat_score = scores.get("threat_score")

            if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
                confidence = None
            if isinstance(threat_score, bool) or not isinstance(threat_score, (int, float)):
                threat_score = None

            evt = {
                "timestamp": time.time(),
                "time_str": time.strftime("%Y-%m-%d %H:%M:%S"),
                "source_ip": source_ip,
                "destination_ip": destination_ip,
                "decoy_type": hit["type"],
                "confidence": confidence,
                "threat_score": threat_score,
                "is_honeypot": True,
                "recommended_action": hit.get("action") or self.default_action
            }
            self.deception_events.append(evt)
            return evt, True

        return None, False

    def list_decoys(self):
        return list(self.decoys.values())

global_deception_manager = HoneypotDeceptionManager()
