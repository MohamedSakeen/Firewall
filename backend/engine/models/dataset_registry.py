import time

class DatasetRegistry:
    """
    Dataset Lineage Registry tracking dataset versions, sample counts, feature schemas,
    label distributions, and data quality metrics.
    """
    def __init__(self):
        self.datasets = {}

    def register_dataset(self, dataset_id, version, sample_count=None, feature_schema=None, label_distribution=None, quality_status=None):
        rec = {
            "dataset_id": dataset_id,
            "version": version,
            "sample_count": sample_count,
            "feature_schema": feature_schema,
            "label_distribution": label_distribution or {},
            "created_at": time.time(),
            "quality_status": quality_status if quality_status else "UNKNOWN"
        }
        self.datasets[dataset_id] = rec
        return rec

    def list_datasets(self):
        return list(self.datasets.values())

global_dataset_registry = DatasetRegistry()
