import time
import copy

class BaselineVersionManager:
    """
    Manages candidate baselines, stability verification, version snapshotting, and rollbacks.
    """
    def __init__(self, asset_ip):
        self.asset_ip = asset_ip
        self.production_version = 1
        self.versions = {}  # version_number -> version_dict
        self.candidate = None

    def save_version(self, baseline_data, reason="Routine baseline update"):
        version_num = len(self.versions) + 1
        snapshot = {
            "version": version_num,
            "asset_ip": self.asset_ip,
            "created_at": time.time(),
            "data": copy.deepcopy(baseline_data),
            "promotion_reason": reason
        }
        self.versions[version_num] = snapshot
        self.production_version = version_num
        return version_num

    def stage_candidate(self, candidate_data):
        self.candidate = {
            "staged_at": time.time(),
            "data": copy.deepcopy(candidate_data),
            "stability_checks": 0
        }

    def promote_candidate(self, reason="Candidate passed stability checks"):
        if not self.candidate:
            return None
        version_num = self.save_version(self.candidate["data"], reason=reason)
        self.candidate = None
        return version_num

    def rollback(self, target_version=None):
        """Rolls back production baseline to a previous clean version snapshot."""
        if not self.versions:
            return None
        if target_version is None:
            target_version = max(1, self.production_version - 1)
            
        if target_version in self.versions:
            self.production_version = target_version
            return self.versions[target_version]
        return None

    def get_current_production_baseline(self):
        if self.production_version in self.versions:
            return self.versions[self.production_version]
        return None
