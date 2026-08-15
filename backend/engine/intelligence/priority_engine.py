class DefensivePriorityEngine:
    """
    Ranks active security incidents to determine which incident defenders should investigate
    and mitigate first, balancing threat score, asset criticality, containment failure, and lateral movement.
    """
    STAGE_WEIGHTS = {
        "EXFILTRATION": 35,
        "LATERAL_MOVEMENT": 30,
        "CREDENTIAL_ATTACK": 20,
        "INITIAL_ACCESS": 15,
        "SERVICE_DISCOVERY": 10,
        "RECONNAISSANCE": 5,
        "UNKNOWN": 0
    }

    CRITICALITY_WEIGHTS = {
        "CRITICAL": 30,
        "HIGH": 20,
        "MEDIUM": 10,
        "LOW": 0
    }

    def calculate_priority(self, incident_dict, has_failed_response=False, has_lateral_movement=False):
        score = 0
        reasons = []

        threat_score = incident_dict.get("threat_score", 0)
        score += threat_score * 0.4
        reasons.append(f"Threat score contribution ({threat_score} x 0.4 = {threat_score * 0.4:.1f})")

        criticality = incident_dict.get("severity", "MEDIUM")
        crit_pts = self.CRITICALITY_WEIGHTS.get(criticality, 10)
        score += crit_pts
        reasons.append(f"Asset criticality weight ({criticality}: +{crit_pts})")

        stage = incident_dict.get("current_stage", "RECONNAISSANCE")
        stage_pts = self.STAGE_WEIGHTS.get(stage, 5)
        score += stage_pts
        reasons.append(f"Attack stage severity ({stage}: +{stage_pts})")

        if has_failed_response:
            score += 25
            reasons.append("Containment failure detected (+25 priority)")

        if has_lateral_movement:
            score += 20
            reasons.append("Multi-host lateral movement evidence present (+20 priority)")

        final_score = round(min(100.0, score), 1)

        if final_score >= 80:
            priority_level = "CRITICAL"
        elif final_score >= 60:
            priority_level = "HIGH"
        elif final_score >= 35:
            priority_level = "MEDIUM"
        else:
            priority_level = "LOW"

        return {
            "priority_score": final_score,
            "priority_level": priority_level,
            "reasons": reasons
        }

global_priority_engine = DefensivePriorityEngine()
