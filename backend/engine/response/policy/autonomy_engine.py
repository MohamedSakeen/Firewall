import time

class AutonomyEngine:
    """
    Manages operational autonomy levels and global emergency stop kill-switch controls.
    Levels:
      LEVEL_0_OBSERVE (Detect and record only)
      LEVEL_1_RECOMMEND (Generate recommendations)
      LEVEL_2_SHADOW (Evaluate without enforcement)
      LEVEL_3_CONTROLLED_AUTO (Execute approved low-risk actions)
      LEVEL_4_ADAPTIVE_DEFENSE (Full bounded adaptive response)
    """
    AUTONOMY_LEVELS = [
        "LEVEL_0_OBSERVE",
        "LEVEL_1_RECOMMEND",
        "LEVEL_2_SHADOW",
        "LEVEL_3_CONTROLLED_AUTO",
        "LEVEL_4_ADAPTIVE_DEFENSE"
    ]

    def __init__(self, default_level="LEVEL_1_RECOMMEND"):
        self.current_level = default_level
        self.kill_switch_active = False
        self.kill_switch_timestamp = None
        self.kill_switch_reason = None

    def set_autonomy_level(self, level):
        if level in self.AUTONOMY_LEVELS:
            self.current_level = level
            return True
        return False

    def trigger_kill_switch(self, reason="Administrator emergency stop"):
        self.kill_switch_active = True
        self.kill_switch_timestamp = time.time()
        self.kill_switch_reason = reason
        return {
            "status": "KILL_SWITCH_ENGAGED",
            "reason": reason,
            "automated_enforcement": "DISABLED",
            "detection_and_alerts": "ACTIVE"
        }

    def reset_kill_switch(self):
        self.kill_switch_active = False
        self.kill_switch_timestamp = None
        self.kill_switch_reason = None
        return {
            "status": "KILL_SWITCH_RESET",
            "automated_enforcement": "RESTORED",
            "autonomy_level": self.current_level
        }

    def is_enforcement_allowed(self, action_risk="LOW"):
        if self.kill_switch_active:
            return False, "REJECTED: Global emergency kill-switch is ENGAGED"

        if self.current_level in ["LEVEL_0_OBSERVE", "LEVEL_1_RECOMMEND", "LEVEL_2_SHADOW"]:
            return False, f"REJECTED: Current autonomy level ({self.current_level}) prohibits direct enforcement"

        if self.current_level == "LEVEL_3_CONTROLLED_AUTO" and action_risk != "LOW":
            return False, "REJECTED: LEVEL_3 autonomy allows only LOW-risk automated actions"

        return True, f"ALLOWED under {self.current_level}"

global_autonomy_engine = AutonomyEngine()
