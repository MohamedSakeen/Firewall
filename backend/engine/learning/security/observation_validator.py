class ObservationValidator:
    """
    Validates whether observation evidence meets stability criteria required
    for baseline promotion (minimum observations, sessions, stable windows).
    """
    def __init__(self, min_observations=100, min_sessions=20, min_confidence=0.85):
        self.min_observations = min_observations
        self.min_sessions = min_sessions
        self.min_confidence = min_confidence

    def validate_candidate(self, sample_count, session_count, confidence):
        reasons = []
        if sample_count < self.min_observations:
            reasons.append(f"Observation count too low ({sample_count} < {self.min_observations})")
        if session_count < self.min_sessions:
            reasons.append(f"Session count too low ({session_count} < {self.min_sessions})")
        if confidence < self.min_confidence:
            reasons.append(f"Confidence score too low ({confidence:.2f} < {self.min_confidence:.2f})")

        is_valid = len(reasons) == 0
        return {
            "is_valid": is_valid,
            "status": "VALIDATED" if is_valid else "VALIDATION_FAILED",
            "reasons": reasons
        }

global_observation_validator = ObservationValidator()
