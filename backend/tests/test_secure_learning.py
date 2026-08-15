import unittest
from engine.learning.poisoning.trusted_gate import TrustedLearningGate
from engine.learning.security.trust_gate import TrustGate
from engine.learning.security.observation_validator import ObservationValidator
from engine.learning.security.poisoning_guard import PoisoningGuard
from engine.learning.security.audit_logger import LearningAuditLogger
from engine.learning.baseline.version_manager import BaselineVersionManager

class TestSecureLearning(unittest.TestCase):
    def test_trusted_learning_gate(self):
        gate = TrustedLearningGate(max_allowed_anomaly_score=0.4)
        allowed, msg = gate.can_update_baseline(anomaly_score=0.1)
        self.assertTrue(allowed)
        
        allowed, msg = gate.can_update_baseline(anomaly_score=0.7)
        self.assertFalse(allowed)
        self.assertIn("High anomaly score", msg)
        
        allowed, msg = gate.can_update_baseline(is_quarantined=True)
        self.assertFalse(allowed)

    def test_security_trust_gate(self):
        tg = TrustGate(max_allowed_anomaly_score=0.4)
        
        # Clean observation
        res_clean = tg.evaluate_observation({"anomaly_score": 0.1, "is_quarantined": False})
        self.assertTrue(res_clean["learn_allowed"])
        self.assertEqual(res_clean["trust_level"], "TRUSTED")

        # Suspicious observation -> Detect = YES, Learn = NO
        res_suspicious = tg.evaluate_observation({"anomaly_score": 0.85, "is_quarantined": False})
        self.assertFalse(res_suspicious["learn_allowed"])
        self.assertEqual(res_suspicious["trust_level"], "SUSPICIOUS")

        # Malicious observation
        res_malicious = tg.evaluate_observation({"is_quarantined": True})
        self.assertFalse(res_malicious["learn_allowed"])
        self.assertEqual(res_malicious["trust_level"], "MALICIOUS")

    def test_poisoning_guard_clamping(self):
        guard = PoisoningGuard(max_delta_pct=0.25)
        # Safe jump: 100 -> 110 (10% increase)
        val, clamped, reason = guard.check_bounded_update(100.0, 110.0)
        self.assertEqual(val, 110.0)
        self.assertFalse(clamped)

        # Poisoning attempt jump: 100 -> 200 (100% increase) -> Clamped to 125 (25% max step)
        val_clamped, clamped, reason = guard.check_bounded_update(100.0, 200.0)
        self.assertEqual(val_clamped, 125.0)
        self.assertTrue(clamped)
        self.assertIn("CLAMPED", reason)

    def test_observation_validator(self):
        validator = ObservationValidator(min_observations=50, min_sessions=10, min_confidence=0.8)
        res_invalid = validator.validate_candidate(sample_count=10, session_count=2, confidence=0.5)
        self.assertFalse(res_invalid["is_valid"])

        res_valid = validator.validate_candidate(sample_count=100, session_count=25, confidence=0.9)
        self.assertTrue(res_valid["is_valid"])

    def test_audit_logger(self):
        logger = LearningAuditLogger()
        rec = logger.log_decision("10.0.0.10", "FL-101", 0.12, {"trust_level": "TRUSTED", "learn_allowed": True, "reason": "Clean"}, baseline_version=2)
        self.assertEqual(rec["asset_ip"], "10.0.0.10")
        self.assertTrue(rec["learn_allowed"])
        self.assertEqual(len(logger.get_recent_logs()), 1)

    def test_version_manager_rollback(self):
        vm = BaselineVersionManager("10.0.0.10")
        v1 = vm.save_version({"normal_ports": [80, 443]}, "Initial version")
        self.assertEqual(v1, 1)
        
        v2 = vm.save_version({"normal_ports": [80, 443, 22]}, "Added SSH")
        self.assertEqual(v2, 2)
        self.assertEqual(vm.production_version, 2)
        
        rolled_back = vm.rollback(1)
        self.assertIsNotNone(rolled_back)
        self.assertEqual(vm.production_version, 1)
        self.assertEqual(vm.get_current_production_baseline()["data"]["normal_ports"], [80, 443])

if __name__ == "__main__":
    unittest.main()
