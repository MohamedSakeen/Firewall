class ContextualAnomalyDetector:
    """
    Evaluates contextual risk multiplier based on asset role, off-hours activity, and unexpected services.
    """
    CRITICALITY_WEIGHTS = {
        "LOW": 0.8,
        "MEDIUM": 1.0,
        "HIGH": 1.3,
        "CRITICAL": 1.6
    }

    def compute_contextual_score(self, raw_anomaly_score, asset_profile, context_dict):
        """
        Adjusts raw anomaly score with contextual factors.
        """
        multiplier = 1.0
        reasons = []

        if asset_profile:
            crit_weight = self.CRITICALITY_WEIGHTS.get(asset_profile.criticality, 1.0)
            multiplier *= crit_weight
            if crit_weight > 1.0:
                reasons.append(f"Target is {asset_profile.criticality} asset")

        if context_dict.get("is_off_hours"):
            multiplier *= 1.25
            reasons.append("Off-hours execution")

        service = context_dict.get("service")
        if asset_profile and hasattr(asset_profile, "is_service_normal"):
            # Check service expectation
            dst_port = context_dict.get("dst_port")
            if dst_port and not asset_profile.is_service_normal(dst_port):
                multiplier *= 1.4
                reasons.append(f"Unusual service '{service}' for asset role '{asset_profile.role}'")

        final_score = min(1.0, round(raw_anomaly_score * multiplier, 4))
        return final_score, {
            "raw_score": raw_anomaly_score,
            "context_multiplier": round(multiplier, 2),
            "reasons": reasons
        }
