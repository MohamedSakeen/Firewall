class ExplainableThreatScorer:
    """
    Multi-signal threat scorer that aggregates weighted security signals into an
    itemized, transparent threat score (0 to 100).
    """
    SIGNAL_WEIGHTS = {
        "port_scan": 20,
        "flood_detected": 25,
        "signature_match": 20,
        "anomaly": 25,
        "threat_intel": 30,
        "honeypot_touch": 35,
        "off_hours_activity": 10,
        "critical_asset_target": 15
    }

    def compute_explainable_score(self, signals_dict):
        """
        Calculates composite threat score and produces itemized explanation breakdown.
        """
        breakdown = []
        raw_score = 0

        for signal, weight in self.SIGNAL_WEIGHTS.items():
            present = signals_dict.get(signal, False)
            if present:
                # Signal can be boolean or custom float factor
                factor = float(present) if isinstance(present, (int, float, bool)) else 1.0
                pts = int(round(weight * factor))
                if pts > 0:
                    raw_score += pts
                    label = signal.replace("_", " ").title()
                    breakdown.append({
                        "signal": signal,
                        "label": label,
                        "points": pts
                    })

        final_score = min(100, raw_score)
        severity = "LOW"
        if final_score >= 80:
            severity = "CRITICAL"
        elif final_score >= 60:
            severity = "HIGH"
        elif final_score >= 35:
            severity = "MEDIUM"

        return {
            "threat_score": final_score,
            "raw_score": raw_score,
            "severity": severity,
            "breakdown": breakdown,
            "explanation_text": f"Threat Score {final_score}/100 ({severity}) based on {len(breakdown)} security signals."
        }

global_explainable_scorer = ExplainableThreatScorer()
