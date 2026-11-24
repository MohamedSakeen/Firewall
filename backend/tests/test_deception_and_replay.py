import unittest
from engine.response.counterfactual import CounterfactualDefenseEngine
from engine.forensics.replay_engine import AttackReplayEngine
from engine.deception.honeypot_listener import DecoyHoneypotListener

class TestDeceptionAndReplay(unittest.TestCase):
    def test_counterfactual_engine(self):
        engine = CounterfactualDefenseEngine()
        incident = {"incident_id": "INC-1001", "attacker_ip": "10.0.0.99"}
<<<<<<< HEAD

        unmeasured = engine.compare_defense_options(incident, asset_criticality="HIGH")
        self.assertIsNone(unmeasured["best_recommendation"])
        self.assertEqual(len(unmeasured["options"]), 4)
        self.assertIsNone(unmeasured["options"][0]["expected_false_blocks"])

        flows = [
            {"src_ip": "10.0.0.99", "dst_port": 22, "is_malicious": True},
            {"src_ip": "10.0.0.50", "dst_port": 443, "is_malicious": False},
        ]
        res = engine.compare_defense_options(incident, asset_criticality="HIGH", flow_history=flows)
        self.assertEqual(res["best_recommendation"], "A: Block Attacker IP")
        self.assertEqual(res["options"][0]["matched_flows"], 1)
=======
        res = engine.compare_defense_options(incident, asset_criticality="HIGH")
        self.assertEqual(res["best_recommendation"], "A: Block Attacker IP")
        self.assertEqual(len(res["options"]), 4)
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

    def test_attack_replay_engine(self):
        replay = AttackReplayEngine()
        flows = [
            {"src_ip": "10.0.0.99", "dst_port": 80, "is_malicious": True},
            {"src_ip": "10.0.0.50", "dst_port": 443, "is_malicious": False}
        ]
        rules = [{"ip": "10.0.0.99"}]
        res = replay.replay_incident_flows(flows, rules)
        self.assertEqual(res["flows_replayed"], 2)
        self.assertEqual(res["current_policy_blocks"], 1)

    def test_honeypot_listener(self):
        listener = DecoyHoneypotListener(decoy_ports=[2222])
        hit, details = listener.check_packet({"src_ip": "10.0.0.88", "dst_port": 2222})
        self.assertTrue(hit)
<<<<<<< HEAD
        self.assertIsNone(details["confidence_score"])
=======
        self.assertEqual(details["confidence_score"], 0.97)
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

        miss, _ = listener.check_packet({"src_ip": "10.0.0.88", "dst_port": 80})
        self.assertFalse(miss)

if __name__ == "__main__":
    unittest.main()
