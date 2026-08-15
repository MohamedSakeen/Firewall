import time

class Incident:
    """
    Correlated security incident aggregating related raw alerts across sliding time windows.
    """
    def __init__(self, incident_id, attacker_ip):
        self.incident_id = incident_id
        self.attacker_ip = attacker_ip
        self.target_assets = set()
        self.alerts = []
        self.created_at = time.time()
        self.updated_at = time.time()
        self.status = "OPEN"  # OPEN, MITIGATED, CLOSED
        self.threat_score = 0
        self.current_stage = "Reconnaissance"

    def add_alert(self, alert_dict):
        self.alerts.append(alert_dict)
        self.updated_at = time.time()
        if alert_dict.get("dst_ip"):
            self.target_assets.add(alert_dict.get("dst_ip"))
        
        # Update stage based on alert signature/type
        alert_type = str(alert_dict.get("type", "")).lower()
        if "scan" in alert_type:
            self.current_stage = "Reconnaissance"
        elif "flood" in alert_type or "dos" in alert_type:
            self.current_stage = "Denial of Service"
        elif "auth" in alert_type or "brute" in alert_type:
            self.current_stage = "Credential Attack"
        elif "exploit" in alert_type or "malware" in alert_type:
            self.current_stage = "Possible Compromise"

    def to_dict(self):
        return {
            "incident_id": self.incident_id,
            "attacker_ip": self.attacker_ip,
            "target_assets": list(self.target_assets),
            "alert_count": len(self.alerts),
            "threat_score": self.threat_score,
            "current_stage": self.current_stage,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
