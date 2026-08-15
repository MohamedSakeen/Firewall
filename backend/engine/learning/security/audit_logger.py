import time

class LearningAuditLogger:
    """
    Maintains structured audit logs of all learning gate decisions, trusted observations,
    and rejected poisoning attempts.
    """
    def __init__(self, max_records=500):
        self.logs = []
        self.max_records = max_records

    def log_decision(self, asset_ip, flow_id, anomaly_score, trust_result, baseline_version=1):
        record = {
            "timestamp": time.time(),
            "time_str": time.strftime("%Y-%m-%d %H:%M:%S"),
            "asset_ip": asset_ip,
            "flow_id": flow_id,
            "anomaly_score": anomaly_score,
            "trust_level": trust_result.get("trust_level", "UNKNOWN"),
            "learn_allowed": trust_result.get("learn_allowed", False),
            "reason": trust_result.get("reason", ""),
            "baseline_version": baseline_version
        }
        self.logs.append(record)
        if len(self.logs) > self.max_records:
            self.logs.pop(0)
        return record

    def get_recent_logs(self, limit=50):
        return self.logs[-limit:]

global_learning_audit_logger = LearningAuditLogger()
