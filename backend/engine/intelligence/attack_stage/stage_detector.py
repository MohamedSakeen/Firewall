from engine.intelligence.attack_stage.stage_model import AttackStageEvidence

class AttackStageDetector:
    """
    Evaluates raw events and behavioral telemetry to infer the current attack stage
    with explicit confidence and telemetry evidence.
    """
    def detect_stage(self, alert_events):
        if not alert_events:
            return AttackStageEvidence("UNKNOWN", confidence=0.0, observed_evidence=["No alerts present"], inference_level="INFERRED")

        evidence = []
        scores = {stage: 0.0 for stage in [
            "RECONNAISSANCE", "SERVICE_DISCOVERY", "INITIAL_ACCESS",
            "CREDENTIAL_ATTACK", "LATERAL_MOVEMENT", "EXFILTRATION", "IMPACT"
        ]}

        for evt in alert_events:
            event_type = str(evt.get("event_type") or evt.get("type", "")).upper()
            
            if "SCAN" in event_type or "PROBE" in event_type:
                scores["RECONNAISSANCE"] += 0.4
                evidence.append(f"OBSERVED: Scan signature ({event_type})")
            elif "DISCOVERY" in event_type or "ENUMERATION" in event_type:
                scores["SERVICE_DISCOVERY"] += 0.4
                evidence.append(f"OBSERVED: Service discovery probe ({event_type})")
            elif "BRUTE" in event_type or "AUTH" in event_type or "SSH" in event_type:
                scores["CREDENTIAL_ATTACK"] += 0.5
                evidence.append(f"OBSERVED: Authentication failure activity ({event_type})")
            elif "LATERAL" in event_type or "SMB" in event_type:
                scores["LATERAL_MOVEMENT"] += 0.5
                evidence.append(f"OBSERVED: Cross-asset internal connection ({event_type})")
            elif "EXFIL" in event_type or "SPIKE" in event_type:
                scores["EXFILTRATION"] += 0.4
                evidence.append(f"OBSERVED: Outbound volume spike ({event_type})")

        best_stage = max(scores, key=scores.get)
        confidence = min(0.99, max(0.4, scores[best_stage]))

        if scores[best_stage] == 0:
            best_stage = "UNKNOWN"
            confidence = 0.3
            evidence.append("OBSERVED: Generic security alerts without clear stage signatures")

        return AttackStageEvidence(
            stage=best_stage,
            confidence=round(confidence, 2),
            observed_evidence=evidence,
            inference_level="INFERRED"
        )

global_stage_detector = AttackStageDetector()
