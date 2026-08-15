import math

class StatisticalBaseline:
    """
    Maintains Exponentially Weighted Moving Average (EWMA) and Variance (EWVAR)
    for numeric network traffic metrics per asset.
    """
    def __init__(self, alpha=0.1):
        self.alpha = alpha  # Smoothing factor
        self.metrics = {}   # metric_name -> {"mean": float, "var": float, "count": int}

    def update_metric(self, metric_name, value):
        if metric_name not in self.metrics:
            self.metrics[metric_name] = {
                "mean": float(value),
                "var": 0.0,
                "count": 1
            }
            return

        stat = self.metrics[metric_name]
        diff = value - stat["mean"]
        # Update EWMA mean
        stat["mean"] = stat["mean"] + self.alpha * diff
        # Update EWVAR variance
        stat["var"] = (1 - self.alpha) * (stat["var"] + self.alpha * (diff ** 2))
        stat["count"] += 1

    def get_z_score(self, metric_name, value):
        """Calculates Z-score with noise floor to avoid divide-by-zero on low variance."""
        if metric_name not in self.metrics:
            return 0.0
        stat = self.metrics[metric_name]
        if stat["count"] < 5:
            return 0.0  # Not enough confidence
        
        # Apply standard deviation noise floor (epsilon = 5% of mean or 0.1)
        raw_std = math.sqrt(stat["var"])
        std = max(0.1, max(raw_std, abs(stat["mean"]) * 0.05))
            
        return (value - stat["mean"]) / std

    def get_metric_stats(self, metric_name):
        if metric_name not in self.metrics:
            return None
        stat = self.metrics[metric_name]
        return {
            "mean": round(stat["mean"], 4),
            "std": round(math.sqrt(stat["var"]), 4),
            "count": stat["count"]
        }
