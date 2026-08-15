import math

class IsolationForestAnomalyDetector:
    """
    Multidimensional anomaly detector with optional scikit-learn IsolationForest or robust distance fallback.
    """
    def __init__(self, contamination=0.05):
        self.contamination = contamination
        self.model = None
        self.fitted = False

        try:
            from sklearn.ensemble import IsolationForest
            self.model = IsolationForest(contamination=self.contamination, random_state=42)
        except ImportError:
            self.model = None

    def fit(self, feature_matrix):
        """Fit model on historical feature vectors [[pps, bps, syn_ratio, rst_ratio], ...]"""
        if len(feature_matrix) < 10:
            return False
        if self.model:
            self.model.fit(feature_matrix)
            self.fitted = True
            return True
        return False

    def predict_anomaly_score(self, feature_vector):
        """Returns normalized anomaly score (0.0 to 1.0) for a 4D feature vector."""
        if self.fitted and self.model:
            # IsolationForest score_samples returns negative anomaly score
            raw_score = -self.model.score_samples([feature_vector])[0]
            # Normalizing range ~[0.3, 0.8] to [0.0, 1.0]
            norm_score = max(0.0, min(1.0, (raw_score - 0.35) / 0.45))
            return round(norm_score, 4)
        
        # Robust distance fallback when sklearn is not available or model not fitted
        norm = math.sqrt(sum(x ** 2 for x in feature_vector))
        return round(min(1.0, norm / 1000.0), 4)
