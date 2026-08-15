import unittest
from engine.learning.baseline.statistical_baseline import StatisticalBaseline
from engine.learning.baseline.asset_profile import AssetProfile
from engine.detection.anomaly.statistical_detector import StatisticalAnomalyDetector
from engine.detection.anomaly.isolation_forest_detector import IsolationForestAnomalyDetector
from engine.detection.anomaly.contextual_detector import ContextualAnomalyDetector

class TestAnomalyDetection(unittest.TestCase):
    def test_statistical_detector(self):
        base = StatisticalBaseline()
        for _ in range(10):
            base.update_metric("packets_per_second", 50.0)
            
        detector = StatisticalAnomalyDetector(base)
        score, details = detector.compute_anomaly_score({"packets_per_second": 500.0})
        self.assertGreater(score, 0.5)

    def test_isolation_forest_detector(self):
        detector = IsolationForestAnomalyDetector()
        score = detector.predict_anomaly_score([10.0, 500.0, 0.01, 0.0])
        self.assertIsInstance(score, float)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_contextual_detector(self):
        asset = AssetProfile("10.0.0.20", role="Database", criticality="CRITICAL")
        asset.observe("10.0.0.1", 5432, "TCP") # observe normal PostgreSQL port
        
        ctx_detector = ContextualAnomalyDetector()
        context = {
            "is_off_hours": True,
            "service": "SSH",
            "dst_port": 22
        }
        score, details = ctx_detector.compute_contextual_score(0.5, asset, context)
        # Should be boosted due to CRITICAL asset, off-hours, and unusual SSH service
        self.assertGreater(score, 0.5)
        self.assertIn("Off-hours execution", details["reasons"])

if __name__ == "__main__":
    unittest.main()
