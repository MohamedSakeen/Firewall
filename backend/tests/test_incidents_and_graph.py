import unittest
from engine.intelligence.correlation.event_correlator import EventCorrelator
from engine.intelligence.attack_graph.graph_builder import AttackGraphBuilder
from engine.intelligence.prediction.stage_predictor import AttackStagePredictor

class TestIncidentsAndGraph(unittest.TestCase):
    def test_event_correlator(self):
        correlator = EventCorrelator()
        alert1 = {"src_ip": "10.0.0.99", "dst_ip": "10.0.0.10", "type": "Port Scan"}
        alert2 = {"src_ip": "10.0.0.99", "dst_ip": "10.0.0.20", "type": "Brute Force"}
        
        inc1 = correlator.process_alert(alert1)
        inc2 = correlator.process_alert(alert2)
        
        self.assertEqual(inc1.incident_id, inc2.incident_id)
        self.assertEqual(len(inc2.alerts), 2)
        self.assertIn("10.0.0.10", inc2.target_assets)
        self.assertIn("10.0.0.20", inc2.target_assets)

    def test_attack_graph_builder(self):
        correlator = EventCorrelator()
        inc = correlator.process_alert({"src_ip": "10.0.0.99", "dst_ip": "10.0.0.10", "type": "Port Scan"})
        
        builder = AttackGraphBuilder()
        graph = builder.build_graph_for_incident(inc)
        
        self.assertEqual(graph["incident_id"], inc.incident_id)
        self.assertGreaterEqual(len(graph["nodes"]), 3)
        self.assertGreaterEqual(len(graph["edges"]), 2)

    def test_stage_predictor(self):
        predictor = AttackStagePredictor()
        res = predictor.predict_next_stages("Reconnaissance")
        self.assertEqual(res["predictions"][0]["next_stage"], "Credential Attack")
        self.assertEqual(res["predictions"][0]["probability"], 55.0)

if __name__ == "__main__":
    unittest.main()
