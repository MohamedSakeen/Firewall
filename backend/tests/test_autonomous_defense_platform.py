import unittest
from engine.intelligence.confidence_framework import ConfidenceFramework, DecisionConfidenceMatrix
from engine.response.policy.autonomy_engine import AutonomyEngine
from engine.response.rollback_manager import ResponseRollbackManager
from engine.models.model_registry import ModelRegistry
from engine.models.dataset_registry import DatasetRegistry
from engine.models.explainability import ExplainableAIEngine
from engine.response.escalation_engine import ResponseEscalationEngine
from engine.health.posture_engine import SecurityPostureEngine
from engine.forensics.replay_lab import SecurityReplayLab

class TestAutonomousDefensePlatform(unittest.TestCase):
    def test_confidence_framework_and_decision_matrix(self):
        self.assertEqual(ConfidenceFramework.get_confidence_level(0.95), "VERY_HIGH")
        self.assertEqual(ConfidenceFramework.get_confidence_level(0.10), "VERY_LOW")

        matrix = DecisionConfidenceMatrix()
        # High threat + high confidence -> AUTOMATED_BLOCK
        res1 = matrix.evaluate_decision_matrix(threat_score=85, confidence_score=0.85, asset_criticality="MEDIUM")
        self.assertEqual(res1["decision"], "AUTOMATED_BLOCK")

        # Critical asset -> HUMAN_REVIEW
        res2 = matrix.evaluate_decision_matrix(threat_score=85, confidence_score=0.85, asset_criticality="CRITICAL")
        self.assertEqual(res2["decision"], "HUMAN_REVIEW")

    def test_autonomy_engine_and_kill_switch(self):
        engine = AutonomyEngine(default_level="LEVEL_1_RECOMMEND")
        self.assertEqual(engine.current_level, "LEVEL_1_RECOMMEND")
        
        # Enforcement disallowed under LEVEL_1
        allowed, msg = engine.is_enforcement_allowed("LOW")
        self.assertFalse(allowed)

        # Set to LEVEL_3
        engine.set_autonomy_level("LEVEL_3_CONTROLLED_AUTO")
        allowed_low, _ = engine.is_enforcement_allowed("LOW")
        self.assertTrue(allowed_low)

        # Trigger Kill Switch
        res_ks = engine.trigger_kill_switch("Emergency test")
        self.assertEqual(res_ks["status"], "KILL_SWITCH_ENGAGED")
        allowed_ks, msg_ks = engine.is_enforcement_allowed("LOW")
        self.assertFalse(allowed_ks)
        self.assertIn("kill-switch", msg_ks)

        # Reset Kill Switch
        engine.reset_kill_switch()
        self.assertFalse(engine.kill_switch_active)

    def test_rollback_manager(self):
        rm = ResponseRollbackManager()
        rec = rm.register_action("ACT-101", "192.168.1.50", duration_seconds=1)
        self.assertEqual(rec["status"], "ACTIVE")

        # Manual rollback
        success, rolled = rm.execute_manual_rollback("ACT-101", reason="Admin test")
        self.assertTrue(success)
        self.assertEqual(rolled["status"], "ROLLED_BACK")

    def test_model_and_dataset_registry(self):
        mr = ModelRegistry()
        m_rec = mr.register_model("M-01", "IsolationForestDetector", "1.0.0", status="PRODUCTION")
        self.assertEqual(m_rec["status"], "PRODUCTION")
        self.assertTrue(mr.update_status("M-01", "DEPRECATED"))

        dr = DatasetRegistry()
        d_rec = dr.register_dataset("DS-01", "v1.0", sample_count=5000)
        self.assertEqual(d_rec["sample_count"], 5000)

    def test_explainable_ai_engine(self):
        xai = ExplainableAIEngine()
        exp = xai.explain_prediction("M-01", "LATERAL_MOVEMENT", {"conn_freq": 12.5, "syn_ratio": 0.9})
        self.assertEqual(exp["model_id"], "M-01")
        self.assertGreater(len(exp["top_contributions"]), 0)

        cf = xai.counterfactual_explanation(85, ["conn_freq"])
        self.assertLess(cf["simulated_score_if_baseline_restored"], 85)

    def test_response_escalation_engine(self):
        ree = ResponseEscalationEngine()
        next_lvl, msg = ree.determine_escalation("MONITOR", verification_status="RESPONSE_FAILED", threat_score=85)
        self.assertEqual(next_lvl, "RATE_LIMIT")

    def test_posture_engine_and_replay_lab(self):
        spe = SecurityPostureEngine()
        score_res = spe.calculate_posture_score(detection_score=90, learning_score=85, response_score=95)
        self.assertEqual(score_res["status"], "HEALTHY")
        self.assertGreaterEqual(score_res["overall_posture_score"], 80.0)

        lab = SecurityReplayLab()
        res_lab = lab.run_scenario("ssh_bruteforce")
        self.assertTrue(res_lab["benchmark_passed"])

if __name__ == "__main__":
    unittest.main()
