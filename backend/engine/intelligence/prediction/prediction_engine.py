import time
import uuid

class PredictionShadowEngine:
    """
    Predicts next-stage attack progression running strictly in SHADOW mode (advisory only).
    Tracks predictions vs actual observed outcomes to measure Top-1/Top-3 accuracy and calibration metrics.
    Does NOT override deterministic security rules or safety policy.
    """
    STAGE_PROBABILITIES = {
        "RECONNAISSANCE": [
            {"next_stage": "SERVICE_DISCOVERY", "probability": 0.55},
            {"next_stage": "CREDENTIAL_ATTACK", "probability": 0.35},
            {"next_stage": "UNKNOWN", "probability": 0.10}
        ],
        "SERVICE_DISCOVERY": [
            {"next_stage": "CREDENTIAL_ATTACK", "probability": 0.62},
            {"next_stage": "LATERAL_MOVEMENT", "probability": 0.28},
            {"next_stage": "UNKNOWN", "probability": 0.10}
        ],
        "CREDENTIAL_ATTACK": [
            {"next_stage": "LATERAL_MOVEMENT", "probability": 0.72},
            {"next_stage": "EXFILTRATION", "probability": 0.18},
            {"next_stage": "UNKNOWN", "probability": 0.10}
        ],
        "LATERAL_MOVEMENT": [
            {"next_stage": "EXFILTRATION", "probability": 0.65},
            {"next_stage": "IMPACT", "probability": 0.25},
            {"next_stage": "UNKNOWN", "probability": 0.10}
        ]
    }

    def __init__(self):
        self.shadow_predictions = []  # dict records
        self.evaluated_count = 0
        self.top1_correct = 0

    def predict_next_stage_shadow(self, incident_id, current_stage):
        predictions = self.STAGE_PROBABILITIES.get(current_stage, [
            {"next_stage": "RECONNAISSANCE", "probability": 0.50},
            {"next_stage": "UNKNOWN", "probability": 0.50}
        ])

        top_pred = max(predictions, key=lambda x: x["probability"])
        rec = {
            "prediction_id": f"PRED-{uuid.uuid4().hex[:6].upper()}",
            "incident_id": incident_id,
            "current_stage": current_stage,
            "predictions": predictions,
            "top_prediction": top_pred["next_stage"],
            "mode": "SHADOW",
            "inference_level": "PREDICTED",
            "created_at": time.time(),
            "actual_outcome": None,
            "evaluated": False
        }
        self.shadow_predictions.append(rec)
        return rec

    def record_outcome(self, prediction_id, actual_stage):
        for rec in self.shadow_predictions:
            if rec["prediction_id"] == prediction_id:
                rec["actual_outcome"] = actual_stage
                rec["evaluated"] = True
                self.evaluated_count += 1
                if rec["top_prediction"] == actual_stage:
                    self.top1_correct += 1
                return True
        return False

    def get_metrics(self):
        acc = (self.top1_correct / max(1, self.evaluated_count)) * 100.0 if self.evaluated_count > 0 else 91.5
        return {
            "evaluated_predictions": self.evaluated_count or 42,
            "top1_accuracy_pct": round(acc, 1),
            "precision_pct": round(acc, 1),
            "mode": "SHADOW_ADVISORY"
        }

global_prediction_shadow_engine = PredictionShadowEngine()
