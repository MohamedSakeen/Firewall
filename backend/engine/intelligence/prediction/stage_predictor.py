class AttackStagePredictor:
    """
    Predicts likely next kill-chain attack stages based on current incident progression.
    """
    STAGE_TRANSITIONS = {
        "Reconnaissance": [
            ("Credential Attack", 0.55),
            ("Service Discovery", 0.30),
            ("Denial of Service", 0.15)
        ],
        "Service Discovery": [
            ("Credential Attack", 0.60),
            ("Possible Compromise", 0.30),
            ("Other", 0.10)
        ],
        "Credential Attack": [
            ("Possible Compromise", 0.65),
            ("Lateral Movement", 0.25),
            ("Other", 0.10)
        ],
        "Possible Compromise": [
            ("Lateral Movement", 0.61),
            ("Privilege Escalation", 0.24),
            ("Exfiltration", 0.15)
        ]
    }

    def predict_next_stages(self, current_stage):
        transitions = self.STAGE_TRANSITIONS.get(current_stage, [
            ("Monitoring", 0.70),
            ("Unknown", 0.30)
        ])
        
        predictions = []
        for next_stage, prob in transitions:
            predictions.append({
                "next_stage": next_stage,
                "probability": round(prob * 100, 1),
                "confidence": "HIGH" if prob > 0.5 else "MEDIUM"
            })
            
        return {
            "current_stage": current_stage,
            "predictions": predictions
        }

global_stage_predictor = AttackStagePredictor()
