import unittest
from engine.intelligence.scoring.explainable_scorer import ExplainableThreatScorer

class TestExplainableScoring(unittest.TestCase):
    def test_explainable_scorer(self):
        scorer = ExplainableThreatScorer()
        signals = {
            "port_scan": True,          # +20
            "anomaly": 0.8,             # +20 (25 * 0.8)
            "honeypot_touch": True,     # +35
            "critical_asset_target": True # +15
        }
        res = scorer.compute_explainable_score(signals)
        self.assertEqual(res["threat_score"], 90)  # 20 + 20 + 35 + 15 = 90
        self.assertEqual(res["severity"], "CRITICAL")
        self.assertEqual(len(res["breakdown"]), 4)
        
        # Verify itemized breakdown contains honeypot_touch
        honeypot_entry = next(item for item in res["breakdown"] if item["signal"] == "honeypot_touch")
        self.assertEqual(honeypot_entry["points"], 35)

if __name__ == "__main__":
    unittest.main()
