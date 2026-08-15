class ConfidenceFramework:
    """
    Standardized confidence scoring framework across anomaly detection, threat scoring,
    attack stage detection, graph correlation, and response recommendation.
    """
    LEVELS = ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]

    @staticmethod
    def get_confidence_level(score):
        """Maps numerical score (0.0 to 1.0) to standardized confidence level."""
        if score >= 0.9:
            return "VERY_HIGH"
        elif score >= 0.75:
            return "HIGH"
        elif score >= 0.5:
            return "MEDIUM"
        elif score >= 0.25:
            return "LOW"
        return "VERY_LOW"

class DecisionConfidenceMatrix:
    """
    Policy matrix mapping Threat Score + Confidence Level + Asset Criticality + Simulation Risk
    to allowed response execution types (AUTOMATED_BLOCK, HUMAN_REVIEW, MONITOR_ALERT).
    """
    def evaluate_decision_matrix(self, threat_score, confidence_score, asset_criticality="MEDIUM", simulation_risk="SAFE"):
        confidence_level = ConfidenceFramework.get_confidence_level(confidence_score)

        if simulation_risk == "HIGH_RISK":
            return {
                "decision": "HUMAN_REVIEW",
                "reason": "Policy simulation flagged HIGH_RISK false positive potential",
                "confidence_level": confidence_level
            }

        if asset_criticality == "CRITICAL" and threat_score < 90:
            return {
                "decision": "HUMAN_REVIEW",
                "reason": "Target asset is CRITICAL; requiring analyst confirmation",
                "confidence_level": confidence_level
            }

        if threat_score >= 80 and confidence_score >= 0.75:
            return {
                "decision": "AUTOMATED_BLOCK",
                "reason": f"High threat ({threat_score}) and high confidence ({confidence_level}); automated block permitted",
                "confidence_level": confidence_level
            }

        if threat_score >= 50:
            return {
                "decision": "HUMAN_REVIEW",
                "reason": f"Moderate threat score ({threat_score}); recommended for analyst approval",
                "confidence_level": confidence_level
            }

        return {
            "decision": "MONITOR_ALERT",
            "reason": "Low threat intensity; heightened monitoring engaged",
            "confidence_level": confidence_level
        }

global_confidence_framework = ConfidenceFramework()
global_decision_confidence_matrix = DecisionConfidenceMatrix()
