import time

class ModelRegistry:
    """
    Model Governance Registry tracking versions, schemas, datasets, validation metrics,
    and lifecycle status (CANDIDATE, SHADOW, VALIDATED, PRODUCTION, DEPRECATED, ROLLED_BACK).
    """
    VALID_STATUSES = {"UNKNOWN", "CANDIDATE", "SHADOW", "VALIDATED", "PRODUCTION", "DEPRECATED", "ROLLED_BACK"}

    def __init__(self):
        self.models = {}

    def register_model(self, model_id, name, version, dataset_version=None, status=None, metrics=None):
        rec = {
            "model_id": model_id,
            "name": name,
            "version": version,
            "dataset_version": dataset_version,
            "status": status if status in self.VALID_STATUSES else "UNKNOWN",
            "registered_at": time.time(),
            "updated_at": time.time(),
            "validation_metrics": metrics or {}
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
