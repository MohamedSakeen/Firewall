import time

class ModelRegistry:
    """
    Model Governance Registry tracking versions, schemas, datasets, validation metrics,
    and lifecycle status (CANDIDATE, SHADOW, VALIDATED, PRODUCTION, DEPRECATED, ROLLED_BACK).
    """
<<<<<<< HEAD
    VALID_STATUSES = {"UNKNOWN", "CANDIDATE", "SHADOW", "VALIDATED", "PRODUCTION", "DEPRECATED", "ROLLED_BACK"}

    def __init__(self):
        self.models = {}

    def register_model(self, model_id, name, version, dataset_version=None, status=None, metrics=None):
=======
    VALID_STATUSES = {"CANDIDATE", "SHADOW", "VALIDATED", "PRODUCTION", "DEPRECATED", "ROLLED_BACK"}

    def __init__(self):
        self.models = {}  # model_id -> dict

    def register_model(self, model_id, name, version, dataset_version="DS-2026-V1", status="CANDIDATE", metrics=None):
        if status not in self.VALID_STATUSES:
            status = "CANDIDATE"

>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        rec = {
            "model_id": model_id,
            "name": name,
            "version": version,
            "dataset_version": dataset_version,
<<<<<<< HEAD
            "status": status if status in self.VALID_STATUSES else "UNKNOWN",
            "registered_at": time.time(),
            "updated_at": time.time(),
            "validation_metrics": metrics or {}
=======
            "status": status,
            "registered_at": time.time(),
            "updated_at": time.time(),
            "validation_metrics": metrics or {"accuracy": 0.95, "false_positive_rate": 0.01}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        }
        self.models[model_id] = rec
        return rec

    def update_status(self, model_id, new_status):
        if model_id in self.models and new_status in self.VALID_STATUSES:
            self.models[model_id]["status"] = new_status
            self.models[model_id]["updated_at"] = time.time()
            return True
        return False

    def list_models(self):
        return list(self.models.values())

global_model_registry = ModelRegistry()
