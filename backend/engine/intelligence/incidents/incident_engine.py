import time

class Incident:
    """
    Correlated security incident aggregating related alerts and behavioral evidence
    across sliding time windows with structured lifecycle status and attack narrative.
    """
    def __init__(self, incident_id, attacker_ip):
        self.incident_id = incident_id
        self.attacker_ip = attacker_ip
        self.source_entities = [attacker_ip]
        self.target_assets = set()
        self.alerts = []
        self.created_at = time.time()
        self.updated_at = time.time()
        self.status = "OPEN"  # OPEN, INVESTIGATING, CONTAINED, RESOLVED, LEARNED
        self.severity = "MEDIUM"
        self.threat_score = 0
        self.confidence = 0.85
        self.current_stage = "Reconnaissance"
        self.recommended_actions = []
        self.executed_actions = []
        self.response_result = None

    def add_alert(self, alert_dict):
        self.alerts.append(alert_dict)
        self.updated_at = time.time()
        if alert_dict.get("dst_ip"):
            self.target_assets.add(alert_dict.get("dst_ip"))
        
        score = alert_dict.get("threat_score") or alert_dict.get("score", 0)
        if score > self.threat_score:
            self.threat_score = score

        if self.threat_score >= 80:
            self.severity = "CRITICAL"
        elif self.threat_score >= 60:
            self.severity = "HIGH"
        elif self.threat_score >= 35:
            self.severity = "MEDIUM"
        else:
            self.severity = "LOW"

        alert_type = str(alert_dict.get("type", "")).lower()
        if "scan" in alert_type:
            self.current_stage = "Reconnaissance"
        elif "flood" in alert_type or "dos" in alert_type:
            self.current_stage = "Denial of Service"
        elif "auth" in alert_type or "brute" in alert_type:
            self.current_stage = "Credential Attack"
        elif "exploit" in alert_type or "malware" in alert_type:
            self.current_stage = "Possible Compromise"

    def generate_attack_story(self):
        story = [f"1. Source entity ({self.attacker_ip}) initiated network probes."]
        stages = set()
        for a in self.alerts:
            t = a.get("type", "Alert")
            stages.add(t)
        
        for idx, stage in enumerate(stages, start=2):
            story.append(f"{idx}. Activity detected: {stage}.")

        story.append(f"{len(story)+1}. Threat score evaluated at {self.threat_score} ({self.severity} severity).")
        if self.executed_actions:
            story.append(f"{len(story)+1}. Automated/Admin response executed: {', '.join(self.executed_actions)}.")
        else:
            story.append(f"{len(story)+1}. Recommended mitigation: {', '.join(self.recommended_actions) if self.recommended_actions else 'MONITOR'}.")

        return story

    def to_dict(self):
        return {
            "incident_id": self.incident_id,
            "attacker_ip": self.attacker_ip,
            "source_entities": self.source_entities,
            "target_assets": list(self.target_assets),
            "alert_count": len(self.alerts),
            "threat_score": self.threat_score,
            "severity": self.severity,
            "confidence": self.confidence,
            "current_stage": self.current_stage,
            "status": self.status,
            "recommended_actions": self.recommended_actions,
            "executed_actions": self.executed_actions,
            "response_result": self.response_result,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "attack_story": self.generate_attack_story()
        }
