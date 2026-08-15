class TrustGate:
    """
    Evaluates new traffic observations against security constraints before allowing
    them into baseline calculations, preventing baseline poisoning attacks.
    """
    def __init__(self, max_allowed_anomaly_score=0.4, min_behavior_stability=0.7):
        self.max_allowed_anomaly_score = max_allowed_anomaly_score
        self.min_behavior_stability = min_behavior_stability

    def evaluate_observation(self, observation):
        """
        Evaluates an observation dictionary.
        Returns dict with trust_level (TRUSTED, SUSPICIOUS, MALICIOUS, UNKNOWN),
        learn_allowed (bool), and explicit reason string.
        """
        anomaly_score = observation.get("anomaly_score", 0.0)
        is_quarantined = observation.get("is_quarantined", False)
        is_active_incident = observation.get("is_active_incident", False)
        is_known_malicious = observation.get("is_known_malicious", False)
        stability = observation.get("behavior_stability", 1.0)

        if is_quarantined or is_known_malicious:
            return {
                "trust_level": "MALICIOUS",
                "learn_allowed": False,
                "reason": "REJECTED: Source IP is quarantined or flagged as known malicious"
            }

        if is_active_incident:
            return {
                "trust_level": "SUSPICIOUS",
                "learn_allowed": False,
                "reason": "REJECTED: Active security incident in progress for target asset"
            }

        if anomaly_score > self.max_allowed_anomaly_score:
            return {
                "trust_level": "SUSPICIOUS",
                "learn_allowed": False,
                "reason": f"REJECTED: High behavioral anomaly score ({anomaly_score:.2f} > {self.max_allowed_anomaly_score:.2f})"
            }

        if stability < self.min_behavior_stability:
            return {
                "trust_level": "SUSPICIOUS",
                "learn_allowed": False,
                "reason": f"REJECTED: Insufficient behavior stability window ({stability:.2f} < {self.min_behavior_stability:.2f})"
            }

        return {
            "trust_level": "TRUSTED",
            "learn_allowed": True,
            "reason": "ALLOWED: Observation clean, stable, and verified low-risk"
        }

global_trust_gate = TrustGate()
