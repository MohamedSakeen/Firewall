import time

class DatasetRegistry:
    """
    Dataset Lineage Registry tracking dataset versions, sample counts, feature schemas,
    label distributions, and data quality metrics.
    """
    def __init__(self):
        self.datasets = {}  # dataset_id -> dict

    def register_dataset(self, dataset_id, version, sample_count=1000, feature_schema="v1.0", label_distribution=None):
        rec = {
            "dataset_id": dataset_id,
            "version": version,
            "sample_count": sample_count,
            "feature_schema": feature_schema,
            "label_distribution": label_distribution or {"benign": 0.85, "malicious": 0.15},
            "created_at": time.time(),
            "quality_status": "VERIFIED"
        }
        self.datasets[dataset_id] = rec
        return rec

    def list_datasets(self):
        return list(self.datasets.values())

global_dataset_registry = DatasetRegistry()
