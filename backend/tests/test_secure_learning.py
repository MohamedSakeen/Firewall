import unittest
from engine.learning.poisoning.trusted_gate import TrustedLearningGate
from engine.learning.baseline.version_manager import BaselineVersionManager

class TestSecureLearning(unittest.TestCase):
    def test_trusted_learning_gate(self):
        gate = TrustedLearningGate(max_allowed_anomaly_score=0.4)
        
        # Clean traffic
        allowed, msg = gate.can_update_baseline(anomaly_score=0.1)
        self.assertTrue(allowed)
        
        # High anomaly
        allowed, msg = gate.can_update_baseline(anomaly_score=0.7)
        self.assertFalse(allowed)
        self.assertIn("High anomaly score", msg)
        
        # Quarantined IP
        allowed, msg = gate.can_update_baseline(is_quarantined=True)
        self.assertFalse(allowed)
        self.assertIn("quarantined", msg)

    def test_version_manager_rollback(self):
        vm = BaselineVersionManager("10.0.0.10")
        v1 = vm.save_version({"normal_ports": [80, 443]}, "Initial version")
        self.assertEqual(v1, 1)
        
        v2 = vm.save_version({"normal_ports": [80, 443, 22]}, "Added SSH")
        self.assertEqual(v2, 2)
        self.assertEqual(vm.production_version, 2)
        
        # Rollback to v1
        rolled_back = vm.rollback(1)
        self.assertIsNotNone(rolled_back)
        self.assertEqual(vm.production_version, 1)
        self.assertEqual(vm.get_current_production_baseline()["data"]["normal_ports"], [80, 443])

if __name__ == "__main__":
    unittest.main()
