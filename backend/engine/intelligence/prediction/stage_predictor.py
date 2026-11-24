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

<<<<<<< HEAD
    def __init__(self, transition_provider=None, learned_transitions=None):
        self.transition_provider = transition_provider
        self.learned_transitions = learned_transitions or {}

    def _normalize_transitions(self, raw):
        if not raw:
            return []
        if isinstance(raw, dict):
            raw = list(raw.items())

        normalized = []
        for entry in raw:
            if isinstance(entry, dict):
                next_stage = entry.get("next_stage")
                probability = entry.get("probability")
            elif isinstance(entry, (list, tuple)) and len(entry) == 2:
                next_stage, probability = entry
            else:
                continue
            if not next_stage or isinstance(probability, bool) or not isinstance(probability, (int, float)):
                continue
            probability = float(probability)
            if probability > 1:
                probability /= 100.0
            normalized.append((next_stage, probability))
        return normalized

    def _observed_transitions(self, current_stage):
        try:
            from engine.intelligence.attack_stage.transition_engine import global_transition_engine
            histories = getattr(global_transition_engine, "incident_stage_history", {})
        except Exception:
            return []

        counts = {}
        for history in histories.values():
            for transition in history:
                if transition.get("previous_stage") != current_stage:
                    continue
                next_stage = transition.get("new_stage")
                if not next_stage:
                    continue
                counts[next_stage] = counts.get(next_stage, 0) + 1

        total = sum(counts.values())
        if total == 0:
            return []
        return [(next_stage, count / total) for next_stage, count in counts.items()]

    def predict_next_stages(self, current_stage):
        transitions = []
        if self.transition_provider is not None:
            try:
                transitions = self._normalize_transitions(self.transition_provider(current_stage))
            except Exception:
                transitions = []
        if not transitions:
            transitions = self._normalize_transitions(self.learned_transitions.get(current_stage))
        if not transitions:
            transitions = self._observed_transitions(current_stage)
        if not transitions:
            transitions = self._normalize_transitions(self.STAGE_TRANSITIONS.get(current_stage))

=======
    def predict_next_stages(self, current_stage):
        transitions = self.STAGE_TRANSITIONS.get(current_stage, [
            ("Monitoring", 0.70),
            ("Unknown", 0.30)
        ])
        
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        predictions = []
        for next_stage, prob in transitions:
            predictions.append({
                "next_stage": next_stage,
                "probability": round(prob * 100, 1),
                "confidence": "HIGH" if prob > 0.5 else "MEDIUM"
            })
<<<<<<< HEAD

=======
            
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        return {
            "current_stage": current_stage,
            "predictions": predictions
        }

global_stage_predictor = AttackStagePredictor()
