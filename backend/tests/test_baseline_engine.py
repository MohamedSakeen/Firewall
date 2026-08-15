import unittest
from engine.learning.baseline.asset_profile import AssetProfile
from engine.learning.baseline.statistical_baseline import StatisticalBaseline

class TestBaselineEngine(unittest.TestCase):
    def test_asset_profile(self):
        asset = AssetProfile("10.0.0.10", role="Web Server", criticality="HIGH")
        self.assertEqual(asset.confidence, 0.0)
        
        for _ in range(50):
            asset.observe("192.168.1.100", 80, "TCP")

        self.assertEqual(asset.confidence, 1.0)
        self.assertTrue(asset.is_service_normal(80))
        self.assertFalse(asset.is_service_normal(22))

    def test_statistical_baseline_ewma(self):
        stat = StatisticalBaseline(alpha=0.2)
        # Feed baseline with normal values around 10.0
        for _ in range(20):
            stat.update_metric("pps", 10.0)
            
        m = stat.get_metric_stats("pps")
        self.assertAlmostEqual(m["mean"], 10.0, places=1)
        
        # Test Z-score for normal vs anomalous value
        z_normal = stat.get_z_score("pps", 10.5)
        self.assertLess(abs(z_normal), 2.0)

        # Spike of 100.0 pps
        z_spike = stat.get_z_score("pps", 100.0)
        self.assertGreater(z_spike, 3.0)

if __name__ == "__main__":
    unittest.main()
