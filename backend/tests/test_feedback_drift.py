import unittest
from engine.learning.feedback.feedback_manager import FeedbackManager
from engine.learning.drift.drift_detector import ConceptDriftDetector

class TestFeedbackAndDrift(unittest.TestCase):
    def test_feedback_manager(self):
        fm = FeedbackManager()
        rec = fm.record_feedback("EVT-101", "FALSE_POSITIVE", analyst_id="analyst1", reason="Authorized backup job", feature_vector=[100, 5000])
        self.assertEqual(rec["label"], "FALSE_POSITIVE")
        self.assertEqual(fm.get_staged_dataset_count(), 1)
        
        fps = fm.get_false_positives()
        self.assertEqual(len(fps), 1)

    def test_invalid_feedback(self):
        fm = FeedbackManager()
        with self.assertRaises(ValueError):
            fm.record_feedback("EVT-102", "INVALID_LABEL")

    def test_concept_drift_detector(self):
        detector = ConceptDriftDetector(threshold=10.0, delta=0.5)
        # Stable baseline inputs around 10
        for _ in range(50):
            drift, stat = detector.add_element(10.0)
            self.assertFalse(drift)

        # Significant persistent mean shift to 100
        drift_occurred = False
        for _ in range(30):
            drift, stat = detector.add_element(100.0)
            if drift:
                drift_occurred = True
                break

        self.assertTrue(drift_occurred)

if __name__ == "__main__":
    unittest.main()
