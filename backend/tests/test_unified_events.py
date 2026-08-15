import unittest
from engine.detection.anomaly.unified_event import UnifiedSecurityEvent, EventEvidenceBuilder
from engine.scoring.explainable_scorer import ExplainableThreatScorer
from engine.intelligence.incidents.incident_engine import Incident
from engine.response.safety_validator import ResponseSafetyValidator
from engine.response.simulator.policy_simulator import PolicySimulator
from engine.response.verification.response_verifier import ResponseVerifier

class TestUnifiedEventsAndAdaptiveDefense(unittest.TestCase):
    def test_unified_security_event_creation(self):
        evt = UnifiedSecurityEvent(
            event_type="SSH_BRUTE_FORCE",
            source_ip="192.168.1.100",
            destination_ip="10.0.0.10",
            anomaly_score=0.85,
            threat_score=80,
            evidence=["SSH connection frequency 11.4x above baseline"]
        )
        d = evt.to_dict()
        self.assertTrue(d["event_id"].startswith("EVT-"))
        self.assertEqual(d["source_ip"], "192.168.1.100")
        self.assertEqual(d["anomaly_score"], 0.85)
        self.assertEqual(len(d["evidence"]), 1)

    def test_event_evidence_builder(self):
        ev = EventEvidenceBuilder.build_evidence({"ssh_rate": "11.4x above baseline", "ports": "80, 22"})
        self.assertEqual(len(ev), 2)
        self.assertIn("ssh_rate: 11.4x above baseline", ev)

    def test_explainable_scorer(self):
        scorer = ExplainableThreatScorer()
        res = scorer.calculate_score_with_breakdown(["PORT_SCAN", "SSH_BRUTE_FORCE"], anomaly_score=0.8, asset_criticality="CRITICAL")
        self.assertGreaterEqual(res["threat_score"], 65)
        self.assertTrue(len(res["breakdown"]) >= 3)

    def test_incident_attack_story(self):
        inc = Incident("INC-9001", "192.168.1.155")
        inc.add_alert({"type": "Port Scan", "dst_ip": "10.0.0.10", "threat_score": 40})
        inc.add_alert({"type": "SSH Brute Force", "dst_ip": "10.0.0.10", "threat_score": 85})
        story = inc.generate_attack_story()
        self.assertGreater(len(story), 2)
        self.assertIn("192.168.1.155", story[0])

    def test_policy_simulator_risk_levels(self):
        sim = PolicySimulator()
        rule = {"ip": "10.0.0.50", "action": "BLOCK"}
        
        # Low false positive rate -> SAFE
        flows_safe = [
            {"src_ip": "10.0.0.50", "dst_ip": "10.0.0.1", "is_malicious": True},
            {"src_ip": "10.0.0.50", "dst_ip": "10.0.0.2", "is_malicious": True}
        ]
        res_safe = sim.simulate_rule(rule, flows_safe)
        self.assertEqual(res_safe["recommendation"], "SAFE")

        # High false positive rate -> HIGH_RISK
        flows_risky = [
            {"src_ip": "10.0.0.50", "dst_ip": "10.0.0.1", "is_malicious": False},
            {"src_ip": "10.0.0.50", "dst_ip": "10.0.0.2", "is_malicious": False}
        ]
        res_risky = sim.simulate_rule(rule, flows_risky)
        self.assertEqual(res_risky["recommendation"], "HIGH_RISK")

    def test_safety_validator(self):
        validator = ResponseSafetyValidator(protected_whitelists=["10.0.0.1"])
        val_white = validator.validate_action("10.0.0.1", "BLOCK")
        self.assertFalse(val_white["is_allowed"])
        self.assertEqual(val_white["status"], "REJECTED_WHITELIST")

    def test_response_verifier_failure_analysis(self):
        verifier = ResponseVerifier()
        res_fail = verifier.verify_effectiveness(pps_before=1000, pps_after=900)
        self.assertEqual(res_fail["outcome"], "FAILED")
        self.assertIn("RESPONSE INEFFECTIVE", res_fail["message"])
        self.assertIsNotNone(res_fail["probable_cause"])

if __name__ == "__main__":
    unittest.main()
