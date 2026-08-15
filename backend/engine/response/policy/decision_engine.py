class AdaptiveDecisionEngine:
    """
    Evaluates candidate responses (MONITOR, LOG_MORE, RATE_LIMIT, TEMPORARY_BLOCK, QUARANTINE)
    balancing security risk against operational availability safety.
    """
    def evaluate_response(self, threat_score, asset_criticality="MEDIUM", is_honeypot=False):
        if is_honeypot or threat_score >= 85:
            if asset_criticality == "CRITICAL":
                return "TEMPORARY_BLOCK", "High threat score on CRITICAL asset -> Temporary block to prevent outage"
            return "QUARANTINE", "High threat score / Honeypot touch -> Full IP Quarantine"
        elif threat_score >= 60:
            return "TEMPORARY_BLOCK", "Elevated threat score -> 1-hour temporary IP block"
        elif threat_score >= 35:
            return "RATE_LIMIT", "Moderate threat score -> Bandwidth rate limit"
        elif threat_score >= 15:
            return "LOG_MORE", "Low anomaly detected -> Heightened logging"

        return "MONITOR", "Normal activity -> Standard monitoring"

global_decision_engine = AdaptiveDecisionEngine()
