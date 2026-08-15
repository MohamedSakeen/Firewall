class ExplainableThreatScorer:
    """
    Aggregates threat signals from IDS signatures, behavioral anomalies, asset criticality,
    and historical offenses into a 0-100 score with explicit line-item evidence breakdown.
    """
    def __init__(self):
        self.weights = {
            "PORT_SCAN": 25,
            "FLOOD": 30,
            "BRUTE_FORCE": 20,
            "ANOMALY_HIGH": 25,
            "ANOMALY_MEDIUM": 15,
            "CRITICAL_ASSET": 10,
            "REPEATED_OFFENDER": 15
        }

    def calculate_score_with_breakdown(self, alert_types, anomaly_score=0.0, asset_criticality="MEDIUM", offense_count=1):
        breakdown = []
        score = 0

        for at in alert_types:
            if "SCAN" in at.upper():
                w = self.weights["PORT_SCAN"]
                score += w
                breakdown.append({"rule": "Port Scan Detected", "points": w})
            elif "FLOOD" in at.upper():
                w = self.weights["FLOOD"]
                score += w
                breakdown.append({"rule": "Traffic Flood Spike", "points": w})
            elif "BRUTE" in at.upper() or "SSH" in at.upper():
                w = self.weights["BRUTE_FORCE"]
                score += w
                breakdown.append({"rule": "Credential Brute Force", "points": w})

        if anomaly_score >= 0.7:
            w = self.weights["ANOMALY_HIGH"]
            score += w
            breakdown.append({"rule": f"High Behavioral Anomaly ({anomaly_score:.2f})", "points": w})
        elif anomaly_score >= 0.4:
            w = self.weights["ANOMALY_MEDIUM"]
            score += w
            breakdown.append({"rule": f"Elevated Behavioral Anomaly ({anomaly_score:.2f})", "points": w})

        if asset_criticality == "CRITICAL":
            w = self.weights["CRITICAL_ASSET"]
            score += w
            breakdown.append({"rule": "Target is CRITICAL infrastructure asset", "points": w})

        if offense_count > 2:
            w = self.weights["REPEATED_OFFENDER"]
            score += w
            breakdown.append({"rule": f"Repeated offender count ({offense_count})", "points": w})

        final_score = min(100, score)
        return {
            "threat_score": final_score,
            "breakdown": breakdown
        }

global_explainable_scorer = ExplainableThreatScorer()
