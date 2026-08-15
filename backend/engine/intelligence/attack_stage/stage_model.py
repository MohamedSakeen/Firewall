class AttackStageVocabulary:
    STAGES = [
        "RECONNAISSANCE",
        "SERVICE_DISCOVERY",
        "INITIAL_ACCESS",
        "CREDENTIAL_ATTACK",
        "EXECUTION",
        "PERSISTENCE",
        "PRIVILEGE_ESCALATION",
        "LATERAL_MOVEMENT",
        "COMMAND_AND_CONTROL",
        "DATA_ACCESS",
        "EXFILTRATION",
        "IMPACT",
        "UNKNOWN"
    ]

    INFERENCE_LEVELS = ["OBSERVED", "INFERRED", "PREDICTED"]

class AttackStageEvidence:
    """
    Encapsulates evidence supporting an attack stage determination,
    distinguishing explicitly between OBSERVED telemetry and INFERRED stage conclusions.
    """
    def __init__(self, stage="UNKNOWN", confidence=0.5, observed_evidence=None, inference_level="INFERRED"):
        self.stage = stage if stage in AttackStageVocabulary.STAGES else "UNKNOWN"
        self.confidence = float(confidence)
        self.observed_evidence = observed_evidence or []
        self.inference_level = inference_level if inference_level in AttackStageVocabulary.INFERENCE_LEVELS else "INFERRED"

    def to_dict(self):
        return {
            "stage": self.stage,
            "confidence": self.confidence,
            "observed_evidence": self.observed_evidence,
            "inference_level": self.inference_level
        }
