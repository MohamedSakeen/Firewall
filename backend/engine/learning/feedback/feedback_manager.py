import time

class FeedbackManager:
    """
    Manages analyst feedback (TRUE_POSITIVE, FALSE_POSITIVE, BENIGN, UNKNOWN),
    maintaining an immutable feedback journal and training dataset candidate.
    """
    VALID_LABELS = {"TRUE_POSITIVE", "FALSE_POSITIVE", "BENIGN", "UNKNOWN"}

    def __init__(self):
        self.feedback_journal = []  # List of feedback record dicts
        self.training_dataset = []  # Staged validated training samples

    def record_feedback(self, event_id, label, analyst_id="admin", reason="", feature_vector=None):
        if label not in self.VALID_LABELS:
            raise ValueError(f"Invalid feedback label '{label}'. Must be one of {self.VALID_LABELS}")

        record = {
            "feedback_id": f"FB-{len(self.feedback_journal) + 1}",
            "event_id": event_id,
            "analyst_id": analyst_id,
            "label": label,
            "reason": reason,
            "timestamp": time.time(),
            "feature_vector": feature_vector
        }
        
        self.feedback_journal.append(record)

        if label in {"TRUE_POSITIVE", "FALSE_POSITIVE", "BENIGN"} and feature_vector:
            self.training_dataset.append({
                "feature_vector": feature_vector,
                "label": 1 if label == "TRUE_POSITIVE" else 0,
                "timestamp": record["timestamp"]
            })

        return record

    def get_false_positives(self):
        return [f for f in self.feedback_journal if f["label"] == "FALSE_POSITIVE"]

    def get_staged_dataset_count(self):
        return len(self.training_dataset)

global_feedback_manager = FeedbackManager()
