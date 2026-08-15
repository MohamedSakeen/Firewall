import unittest
from engine.intelligence.assets.asset_manager import AssetManager
from engine.hunting.hunting_engine import ThreatHuntingEngine
from engine.forensics.timeline_builder import ForensicTimelineBuilder
from engine.models.governance import ModelGovernanceManager
from engine.health.self_monitoring import SelfMonitoringEngine

class TestGovernanceAndHealth(unittest.TestCase):
    def test_asset_manager(self):
        am = AssetManager()
        am.register_asset("10.0.0.10", hostname="web-01", role="Web Server", criticality="HIGH")
        asset = am.get_asset("10.0.0.10")
        self.assertEqual(asset["role"], "Web Server")

    def test_hunting_engine(self):
        he = ThreatHuntingEngine()
        flows = [
            {"src_ip": "10.0.0.99", "threat_score": 85, "protocol": "TCP"},
            {"src_ip": "10.0.0.5", "threat_score": 10, "protocol": "UDP"}
        ]
        res = he.execute_search(flows, min_threat_score=50)
        self.assertEqual(res["total_matches"], 1)
        self.assertEqual(res["results"][0]["src_ip"], "10.0.0.99")

    def test_timeline_builder(self):
        tb = ForensicTimelineBuilder()
        inc = {
            "incident_id": "INC-100",
            "alerts": [
                {"type": "Port Scan", "src_ip": "10.0.0.99", "dst_port": 80, "timestamp": 1700000000.0}
            ]
        }
        res = tb.build_timeline_for_incident(inc)
        self.assertEqual(res["event_count"], 1)
        self.assertIn("Port Scan", res["timeline"][0]["description"])

    def test_model_governance(self):
        mg = ModelGovernanceManager()
        mg.register_model("M-01", "IsolationForestDetector")
        success = mg.promote_stage("M-01", "PRODUCTION")
        self.assertTrue(success)
        self.assertEqual(mg.registered_models["M-01"]["status"], "PRODUCTION")

    def test_self_monitoring(self):
        sm = SelfMonitoringEngine()
        res = sm.run_health_check()
        self.assertEqual(res["overall_status"], "HEALTHY")
        self.assertIn("Stateful Firewall", res["subsystems"])

if __name__ == "__main__":
    unittest.main()
