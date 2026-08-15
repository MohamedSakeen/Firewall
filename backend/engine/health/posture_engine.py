class SecurityPostureEngine:
    """
    Aggregates network security posture score (0-100) combining Detection, Learning,
    Response Effectiveness, Asset Risk, and Model Health components.
    """
    def calculate_posture_score(self, detection_score=91, learning_score=87, response_score=94, asset_risk_score=73, model_health=89):
        weighted_score = (
            (detection_score * 0.25) +
            (learning_score * 0.20) +
            (response_score * 0.25) +
            (asset_risk_score * 0.15) +
            (model_health * 0.15)
        )
        final_score = round(weighted_score, 1)
        return {
            "overall_posture_score": final_score,
            "status": "HEALTHY" if final_score >= 80 else ("ELEVATED_RISK" if final_score >= 60 else "CRITICAL_RISK"),
            "components": {
                "detection": detection_score,
                "learning": learning_score,
                "response_effectiveness": response_score,
                "asset_risk": asset_risk_score,
                "model_health": model_health
            }
        }

global_posture_engine = SecurityPostureEngine()
