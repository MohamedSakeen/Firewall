class TrustedLearningGate:
    """
    Prevents baseline poisoning by gating model updates.
    Baseline updates are rejected if traffic is anomalous, quarantined, or part of an active incident.
    """
    def __init__(self, max_allowed_anomaly_score=0.4):
        self.max_allowed_anomaly_score = max_allowed_anomaly_score

    def can_update_baseline(self, anomaly_score=0.0, is_active_incident=False, is_quarantined=False, is_threat_intel_flagged=False):
        """
        Evaluates safety gate conditions. Returns (bool, reason_string).
        """
        if is_quarantined:
            return False, "REJECTED: Source IP is quarantined"
        if is_active_incident:
            return False, "REJECTED: Active security incident in progress"
        if is_threat_intel_flagged:
            return False, "REJECTED: Traffic flagged by threat intelligence"
        if anomaly_score > self.max_allowed_anomaly_score:
            return False, f"REJECTED: High anomaly score ({anomaly_score} > {self.max_allowed_anomaly_score})"
        
        return True, "ALLOWED: Traffic clean & stable"

global_trusted_gate = TrustedLearningGate()
