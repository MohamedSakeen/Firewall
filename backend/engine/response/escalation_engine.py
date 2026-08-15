class ResponseEscalationEngine:
    """
    Manages progressive response escalation chains:
    Level 1: MONITOR -> Level 2: RATE_LIMIT -> Level 3: TEMPORARY_BLOCK -> Level 4: QUARANTINE
    Escalates only when prior mitigation attempts fail or threat score escalates.
    """
    ESCALATION_LEVELS = ["MONITOR", "RATE_LIMIT", "TEMPORARY_BLOCK", "QUARANTINE"]

    def determine_escalation(self, current_level, verification_status="RESPONSE_FAILED", threat_score=85):
        if current_level not in self.ESCALATION_LEVELS:
            return "MONITOR", "Initial monitoring level"

        idx = self.ESCALATION_LEVELS.index(current_level)
        if verification_status in ["RESPONSE_FAILED", "FAILED"] or threat_score >= 85:
            if idx < len(self.ESCALATION_LEVELS) - 1:
                next_level = self.ESCALATION_LEVELS[idx + 1]
                return next_level, f"ESCALATED: Prior response ({current_level}) failed or threat score elevated ({threat_score})"

        return current_level, f"MAINTAINED: Current level ({current_level}) stable"

global_escalation_engine = ResponseEscalationEngine()
