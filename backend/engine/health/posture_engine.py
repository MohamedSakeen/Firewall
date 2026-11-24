class SecurityPostureEngine:
    """
    Aggregates network security posture score (0-100) combining Detection, Learning,
    Response Effectiveness, Asset Risk, and Model Health components.
    """
    WEIGHTS = {
        "detection": 0.25,
        "learning": 0.20,
        "response_effectiveness": 0.25,
        "asset_risk": 0.15,
        "model_health": 0.15,
    }

    def calculate_posture_score(self, detection_score=None, learning_score=None, response_score=None, asset_risk_score=None, model_health=None):
        components = {
            "detection": detection_score,
            "learning": learning_score,
            "response_effectiveness": response_score,
            "asset_risk": asset_risk_score,
            "model_health": model_health,
        }

        validated = {}
        for name, value in components.items():
            if value is None:
                validated[name] = None
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(f"{name} must be a numeric score between 0 and 100")
            validated[name] = round(max(0.0, min(100.0, float(value))), 1)

        if any(value is None for value in validated.values()):
            return {
                "overall_posture_score": None,
                "status": "UNKNOWN",
                "components": validated
            }

        weighted_score = sum(validated[name] * weight for name, weight in self.WEIGHTS.items())
        final_score = round(weighted_score, 1)
        return {
            "overall_posture_score": final_score,
            "status": "HEALTHY" if final_score >= 80 else ("ELEVATED_RISK" if final_score >= 60 else "CRITICAL_RISK"),
            "components": validated
        }

global_posture_engine = SecurityPostureEngine()
