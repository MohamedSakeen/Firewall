class ResponseVerifier:
    """
    Measures post-mitigation traffic throughput to verify if defensive block action was effective.
    """
    def verify_effectiveness(self, pps_before, pps_after, min_reduction_pct=90.0):
        if pps_before <= 0:
            return {
                "effectiveness_pct": 100.0,
                "status": "SUCCESS",
                "message": "No baseline traffic detected before block"
            }

        reduction = max(0.0, pps_before - pps_after)
        pct = round((reduction / pps_before) * 100, 2)
        status = "SUCCESS" if pct >= min_reduction_pct else "RESPONSE FAILED"

        return {
            "pps_before": pps_before,
            "pps_after": pps_after,
            "effectiveness_pct": pct,
            "status": status,
            "message": f"Traffic throughput reduced by {pct}% ({status})"
        }

global_response_verifier = ResponseVerifier()
