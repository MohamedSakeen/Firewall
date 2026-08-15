import time
import uuid

class ResponseVerifier:
    """
    Measures post-mitigation traffic throughput to verify if defensive block action was effective.
    Classifies outcomes into: SUCCESS, PARTIAL_SUCCESS, FAILED, FALSE_POSITIVE, BENIGN, UNKNOWN.
    """
    def verify_effectiveness(self, pps_before, pps_after, min_reduction_pct=90.0, incident_id=None, action="BLOCK"):
        response_id = f"RESP-{uuid.uuid4().hex[:6].upper()}"
        if pps_before <= 0:
            return {
                "response_id": response_id,
                "incident_id": incident_id,
                "action": action,
                "pps_before": pps_before,
                "pps_after": pps_after,
                "effectiveness_pct": 100.0,
                "status": "SUCCESS",
                "outcome": "SUCCESS",
                "message": "No baseline traffic detected before block",
                "verified_at": time.time()
            }

        reduction = max(0.0, pps_before - pps_after)
        pct = round((reduction / pps_before) * 100, 2)

        if pct >= min_reduction_pct:
            status = "SUCCESS"
            outcome = "SUCCESS"
            message = f"Mitigation highly effective: Traffic reduced by {pct}%"
            cause = None
        elif pct >= 50.0:
            status = "PARTIAL_SUCCESS"
            outcome = "PARTIAL_SUCCESS"
            message = f"Mitigation partially effective: Traffic reduced by {pct}%"
            cause = "Attacker may have switched alternate ports or source IPs"
        else:
            status = "RESPONSE_FAILED"
            outcome = "FAILED"
            message = f"RESPONSE INEFFECTIVE: Traffic only reduced by {pct}%"
            cause = "Possible rule mismatch, bypass path, or alternate attacker source"

        return {
            "response_id": response_id,
            "incident_id": incident_id,
            "action": action,
            "pps_before": pps_before,
            "pps_after": pps_after,
            "effectiveness_pct": pct,
            "status": status,
            "outcome": outcome,
            "message": message,
            "probable_cause": cause,
            "verified_at": time.time()
        }

global_response_verifier = ResponseVerifier()
