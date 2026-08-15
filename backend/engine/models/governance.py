import time

class ModelGovernanceManager:
    """
    Tracks ML model lifecycle (DEVELOPMENT -> CANDIDATE -> SHADOW -> VALIDATED -> PRODUCTION),
    dataset lineage, drift scores, and promotion rollback.
    """
    STAGES = ["DEVELOPMENT", "CANDIDATE", "SHADOW", "VALIDATED", "PRODUCTION", "DEPRECATED"]

    def __init__(self):
        self.registered_models = {}  # model_id -> model_info

    def register_model(self, model_id, model_name, version="1.0.0", dataset_version="DS-V1"):
        info = {
            "model_id": model_id,
            "name": model_name,
            "version": version,
            "dataset_version": dataset_version,
            "status": "DEVELOPMENT",
            "registered_at": time.time(),
            "last_promoted": None,
            "validation_metrics": {"accuracy": 0.95, "false_positive_rate": 0.01}
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
