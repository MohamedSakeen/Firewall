import unittest
from engine.response.policy.decision_engine import AdaptiveDecisionEngine
from engine.response.safety_validator import ResponseSafetyValidator
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

    def test_safety_validator(self):
        validator = ResponseSafetyValidator(protected_whitelists=["127.0.0.1", "10.0.0.1"])
        
        # Whitelisted IP test
        val_white = validator.validate_action("10.0.0.1", "BLOCK")
        self.assertFalse(val_white["is_allowed"])
        self.assertEqual(val_white["status"], "REJECTED_WHITELIST")

        # Critical asset quarantine test
        val_crit = validator.validate_action("10.0.0.20", "QUARANTINE", asset_criticality="CRITICAL")
        self.assertFalse(val_crit["is_allowed"])
        self.assertEqual(val_crit["status"], "REJECTED_CRITICAL_ASSET")

        # Clean target test
        val_clean = validator.validate_action("192.168.1.99", "TEMPORARY_BLOCK")
        self.assertTrue(val_clean["is_allowed"])

    def test_policy_simulator(self):
        sim = PolicySimulator()
        rule = {"ip": "10.0.0.99", "action": "BLOCK"}
        history = [
            {"src_ip": "10.0.0.99", "dst_ip": "10.0.0.1", "is_malicious": True},
            {"src_ip": "10.0.0.99", "dst_ip": "10.0.0.2", "is_malicious": True},
            {"src_ip": "10.0.0.5", "dst_ip": "10.0.0.1", "is_malicious": False}
        ]
        res = sim.simulate_rule(rule, history)
        self.assertEqual(res["matched_flows"], 2)
        self.assertEqual(res["malicious_matches"], 2)
        self.assertEqual(res["recommendation"], "SAFE")

    def test_shadow_rules_lifecycle(self):
        evaluator = ShadowRuleEvaluator()
        evaluator.add_shadow_rule("R-1", target_ip="192.168.1.50")
        pkt = {"src_ip": "192.168.1.50", "dst_ip": "10.0.0.1"}
        matches = evaluator.evaluate_packet(pkt, is_legitimate=False)
        self.assertEqual(len(matches), 1)
        self.assertEqual(evaluator.shadow_rules["R-1"]["matches"], 1)

        # Promote
        promoted = evaluator.promote_to_active("R-1")
        self.assertTrue(promoted)
        self.assertEqual(evaluator.shadow_rules["R-1"]["mode"], "ACTIVE")

        # Reject test
        evaluator.add_shadow_rule("R-2", target_ip="192.168.1.51")
        rejected = evaluator.reject_rule("R-2", reason="High FP rate")
        self.assertTrue(rejected)
        self.assertEqual(evaluator.shadow_rules["R-2"]["mode"], "REJECTED")

    def test_response_verifier(self):
        verifier = ResponseVerifier()
        # Effective mitigation
        res_ok = verifier.verify_effectiveness(pps_before=823, pps_after=4)
        self.assertEqual(res_ok["outcome"], "SUCCESS")
        self.assertGreaterEqual(res_ok["effectiveness_pct"], 99.0)

        # Failed mitigation
        res_failed = verifier.verify_effectiveness(pps_before=800, pps_after=750)
        self.assertEqual(res_failed["outcome"], "FAILED")
        self.assertIn("RESPONSE INEFFECTIVE", res_failed["message"])
        self.assertIsNotNone(res_failed["probable_cause"])

if __name__ == "__main__":
    unittest.main()
