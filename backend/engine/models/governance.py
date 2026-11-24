import time

class ModelGovernanceManager:
    """
    Tracks ML model lifecycle (DEVELOPMENT -> CANDIDATE -> SHADOW -> VALIDATED -> PRODUCTION),
    dataset lineage, drift scores, and promotion rollback.
    """
    STAGES = ["UNKNOWN", "DEVELOPMENT", "CANDIDATE", "SHADOW", "VALIDATED", "PRODUCTION", "DEPRECATED"]

    def __init__(self):
        self.registered_models = {}

    def register_model(self, model_id, model_name, version=None, dataset_version=None, status=None, validation_metrics=None):
        info = {
            "model_id": model_id,
            "name": model_name,
            "version": version,
            "dataset_version": dataset_version,
            "status": status if status in self.STAGES else "UNKNOWN",
            "registered_at": time.time(),
            "last_promoted": None,
            "validation_metrics": validation_metrics or {}
        }
        self.registered_models[model_id] = info
        return info

    def promote_stage(self, model_id, target_stage):
        if target_stage not in self.STAGES:
            raise ValueError(f"Invalid target stage '{target_stage}'")
        if model_id in self.registered_models:
            self.registered_models[model_id]["status"] = target_stage
            self.registered_models[model_id]["last_promoted"] = time.time()
            return True
        return False

    def list_models(self):
        return list(self.registered_models.values())

global_governance_manager = ModelGovernanceManager()
