class StatisticalAnomalyDetector:
    """
    Evaluates univariate statistical anomaly scores (0.0 to 1.0) using baseline Z-scores.
    """
    def __init__(self, statistical_baseline):
        self.baseline = statistical_baseline

    def compute_anomaly_score(self, feature_dict):
        """
        Computes anomaly score (0.0 to 1.0) based on Z-score deviations of feature metrics.
        """
        z_scores = []
        for metric in ["packets_per_second", "bytes_per_second", "syn_ratio", "rst_ratio"]:
            val = feature_dict.get(metric)
            if val is not None:
                z = self.baseline.get_z_score(metric, val)
                z_scores.append(abs(z))

        if not z_scores:
            return 0.0, {}

        max_z = max(z_scores)
        # Sigmoid-like mapping: Z=3.0 -> ~0.75 score, Z=5.0 -> ~0.95 score
        score = min(1.0, max_z / 4.0)
        
        details = {
            "max_z_score": round(max_z, 2),
            "metric_z_scores": z_scores
        }
        return round(score, 4), details
