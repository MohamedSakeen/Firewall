import time

class StageTransitionEngine:
    """
    Models attack progression across stages (e.g. RECONNAISSANCE -> SERVICE_DISCOVERY -> CREDENTIAL_ATTACK -> LATERAL_MOVEMENT).
    Tracks stage transitions, timestamps, confidence, and supporting evidence.
    """
    def __init__(self):
        self.incident_stage_history = {}  # incident_id -> list of transition dicts

    def evaluate_transition(self, incident_id, new_stage_evidence):
        now = time.time()
        new_stage = new_stage_evidence.stage
        confidence = new_stage_evidence.confidence
        evidence = new_stage_evidence.observed_evidence

        if incident_id not in self.incident_stage_history:
            self.incident_stage_history[incident_id] = []

        history = self.incident_stage_history[incident_id]
        previous_stage = history[-1]["new_stage"] if history else "UNKNOWN"

        if previous_stage != new_stage:
            transition = {
                "timestamp": now,
                "time_str": time.strftime("%Y-%m-%d %H:%M:%S"),
                "previous_stage": previous_stage,
                "new_stage": new_stage,
                "confidence": confidence,
                "evidence": evidence
            }
            history.append(transition)
            return transition, True

        return None, False

    def get_history(self, incident_id):
        return self.incident_stage_history.get(incident_id, [])

global_transition_engine = StageTransitionEngine()
