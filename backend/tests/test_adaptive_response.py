import unittest
from engine.response.policy.decision_engine import AdaptiveDecisionEngine
from engine.response.simulator.policy_simulator import PolicySimulator
from engine.response.shadow.shadow_evaluator import ShadowRuleEvaluator
from engine.response.verification.response_verifier import ResponseVerifier

class TestAdaptiveResponse(unittest.TestCase):
    def test_decision_engine(self):
        engine = AdaptiveDecisionEngine()
        action, reason = engine.evaluate_response(threat_score=90, asset_criticality="HIGH")
        self.assertEqual(action, "QUARANTINE")

        action2, _ = engine.evaluate_response(threat_score=40)
        self.assertEqual(action2, "RATE_LIMIT")

    def test_policy_simulator(self):
        sim = PolicySimulator()
        rule = {"ip": "10.0.0.99", "action": "BLOCK"}
        history = [
            {"src_ip": "10.0.0.99", "dst_ip": "10.0.0.1", "is_malicious": True},
            {"src_ip": "10.0.0.99", "dst_ip": "10.0.0.2", "is_malicious": True},
            {"src_ip": "10.0.0.5", "dst_ip": "10.0.0.1", "is_malicious": False}
        ]
        res = sim.simulate_rule(rule, history)
        self.assertEqual(res["would_block"], 2)
        self.assertEqual(res["known_malicious"], 2)
        self.assertEqual(res["recommendation"], "SAFE")

    def test_shadow_rules(self):
        evaluator = ShadowRuleEvaluator()
        evaluator.add_shadow_rule("R-1", target_ip="192.168.1.50")
        pkt = {"src_ip": "192.168.1.50", "dst_ip": "10.0.0.1"}
        matches = evaluator.evaluate_packet(pkt, is_legitimate=False)
        self.assertEqual(len(matches), 1)
        self.assertEqual(evaluator.shadow_rules["R-1"]["matches"], 1)

    def test_response_verifier(self):
        verifier = ResponseVerifier()
        res = verifier.verify_effectiveness(pps_before=823, pps_after=4)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertGreaterEqual(res["effectiveness_pct"], 99.0)

if __name__ == "__main__":
    unittest.main()
