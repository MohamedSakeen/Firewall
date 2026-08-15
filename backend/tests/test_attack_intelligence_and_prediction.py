import unittest
from engine.intelligence.assets.relationship_engine import AssetRelationshipEngine
from engine.intelligence.attack_stage.stage_model import AttackStageEvidence
from engine.intelligence.attack_stage.stage_detector import AttackStageDetector
from engine.intelligence.attack_stage.transition_engine import StageTransitionEngine
from engine.intelligence.priority_engine import DefensivePriorityEngine
from engine.intelligence.prediction.prediction_engine import PredictionShadowEngine
from engine.response.counterfactual import CounterfactualDefenseEngine
from engine.deception.honeypot_manager import HoneypotDeceptionManager

class TestAttackIntelligenceAndPrediction(unittest.TestCase):
    def test_asset_relationship_engine(self):
        engine = AssetRelationshipEngine()
        rel = engine.add_relationship("192.168.1.100", "10.0.0.10", "scanned", confidence=0.9, evidence="Port scan 80, 22")
        self.assertEqual(rel["relationship_type"], "scanned")
        self.assertEqual(len(engine.get_relationships_for_asset("192.168.1.100")), 1)

    def test_attack_stage_detector(self):
        detector = AttackStageDetector()
        alerts = [
            {"type": "SSH Brute Force", "src_ip": "192.168.1.105"},
            {"type": "Auth Failure", "src_ip": "192.168.1.105"}
        ]
        ev = detector.detect_stage(alerts)
        self.assertEqual(ev.stage, "CREDENTIAL_ATTACK")
        self.assertEqual(ev.inference_level, "INFERRED")
        self.assertGreater(len(ev.observed_evidence), 0)

    def test_stage_transition_engine(self):
        te = StageTransitionEngine()
        ev1 = AttackStageEvidence("RECONNAISSANCE", confidence=0.9)
        ev2 = AttackStageEvidence("CREDENTIAL_ATTACK", confidence=0.95)

        t1, changed1 = te.evaluate_transition("INC-101", ev1)
        self.assertTrue(changed1)
        self.assertEqual(t1["new_stage"], "RECONNAISSANCE")

        t2, changed2 = te.evaluate_transition("INC-101", ev2)
        self.assertTrue(changed2)
        self.assertEqual(t2["previous_stage"], "RECONNAISSANCE")
        self.assertEqual(t2["new_stage"], "CREDENTIAL_ATTACK")

    def test_defensive_priority_engine(self):
        priority = DefensivePriorityEngine()
        inc = {"incident_id": "INC-1001", "threat_score": 88, "severity": "HIGH", "current_stage": "CREDENTIAL_ATTACK"}
        res = priority.calculate_priority(inc, has_failed_response=True, has_lateral_movement=True)
        self.assertEqual(res["priority_level"], "CRITICAL")
        self.assertGreaterEqual(res["priority_score"], 80.0)

    def test_prediction_shadow_engine(self):
        pred_engine = PredictionShadowEngine()
        pred = pred_engine.predict_next_stage_shadow("INC-1001", "CREDENTIAL_ATTACK")
        self.assertEqual(pred["mode"], "SHADOW")
        self.assertEqual(pred["inference_level"], "PREDICTED")
        self.assertEqual(pred["top_prediction"], "LATERAL_MOVEMENT")

        recorded = pred_engine.record_outcome(pred["prediction_id"], "LATERAL_MOVEMENT")
        self.assertTrue(recorded)
        metrics = pred_engine.get_metrics()
        self.assertEqual(metrics["mode"], "SHADOW_ADVISORY")

    def test_counterfactual_defense_engine(self):
        cf = CounterfactualDefenseEngine()
        inc = {"incident_id": "INC-1001", "attacker_ip": "192.168.1.105"}
        comp = cf.compare_defense_options(inc)
        self.assertIn("options", comp)
        actions = [opt["action"] for opt in comp["options"]]
        self.assertIn("BLOCK_IP", actions)

    def test_deception_manager(self):
        dec = HoneypotDeceptionManager()
        evt, hit = dec.evaluate_interaction("192.168.1.200", "10.0.0.99", destination_port=21)
        self.assertTrue(hit)
        self.assertEqual(evt["threat_score"], 95)
        self.assertEqual(evt["decoy_type"], "DECOY_FTP")

if __name__ == "__main__":
    unittest.main()
