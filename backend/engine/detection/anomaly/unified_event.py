import time
import uuid

class UnifiedSecurityEvent:
    """
    Standardized internal security event structure combining signature, heuristic,
    and statistical anomaly signals into a unified security pipeline event.
    """
    def __init__(
        self,
        event_type="BEHAVIORAL_ANOMALY",
        source_ip="0.0.0.0",
        destination_ip="0.0.0.0",
        source_port=0,
        destination_port=0,
        protocol="TCP",
        asset_id="ASSET-UNKNOWN",
        flow_id=None,
        session_id=None,
        detector="StatisticalAnomalyEngine",
        severity="MEDIUM",
        anomaly_score=0.0,
        threat_score=0,
        confidence=0.85,
        evidence=None,
        source_category="anomaly",
        recommended_action="MONITOR"
    ):
        self.event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        self.timestamp = time.time()
        self.time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        self.event_type = event_type
        self.source_ip = source_ip
        self.destination_ip = destination_ip
        self.source_port = source_port
        self.destination_port = destination_port
        self.protocol = protocol
        self.asset_id = asset_id
        self.flow_id = flow_id or f"FL-{uuid.uuid4().hex[:6].upper()}"
        self.session_id = session_id
        self.detector = detector
        self.severity = severity
        self.anomaly_score = float(anomaly_score)
        self.threat_score = int(threat_score)
        self.confidence = float(confidence)
        self.evidence = evidence or []
        self.source_category = source_category
        self.recommended_action = recommended_action

    def to_dict(self):
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "time_str": self.time_str,
            "event_type": self.event_type,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "source_port": self.source_port,
            "destination_port": self.destination_port,
            "protocol": self.protocol,
            "asset_id": self.asset_id,
            "flow_id": self.flow_id,
            "session_id": self.session_id,
            "detector": self.detector,
            "severity": self.severity,
            "anomaly_score": self.anomaly_score,
            "threat_score": self.threat_score,
            "confidence": self.confidence,
            "evidence": self.evidence,
            "source_category": self.source_category,
            "recommended_action": self.recommended_action
        }

class EventEvidenceBuilder:
    """
    Constructs explainable evidence items linking behavioral anomalies to specific metric deviations.
    """
    @staticmethod
    def build_evidence(anomaly_details):
        evidence_items = []
        if isinstance(anomaly_details, dict):
            for k, v in anomaly_details.items():
                evidence_items.append(f"{k}: {v}")
        elif isinstance(anomaly_details, list):
            evidence_items = [str(x) for x in anomaly_details]
        elif isinstance(anomaly_details, str):
            evidence_items = [anomaly_details]
        return evidence_items
