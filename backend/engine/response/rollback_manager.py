import time

class ResponseRollbackManager:
    """
    Tracks active defense actions, expiration timers, and explicit rollback instructions.
    Ensures temporary blocks and rate limits do not remain active indefinitely.
    """
    def __init__(self):
        self.active_actions = {}  # action_id -> dict

    def register_action(self, action_id, target_ip, action_type="TEMPORARY_BLOCK", duration_seconds=600, rollback_command=None):
        now = time.time()
        record = {
            "action_id": action_id,
            "target_ip": target_ip,
            "action_type": action_type,
            "duration_seconds": duration_seconds,
            "created_at": now,
            "expires_at": now + duration_seconds,
            "rollback_command": rollback_command or f"REMOVE_RULE_{action_id}",
            "status": "ACTIVE"
        }
        self.active_actions[action_id] = record
        return record

    def check_expirations(self):
        now = time.time()
        expired = []
        for a_id, rec in list(self.active_actions.items()):
            if rec["status"] == "ACTIVE" and now >= rec["expires_at"]:
                rec["status"] = "EXPIRED"
                expired.append(rec)
        return expired

    def execute_manual_rollback(self, action_id, reason="Manual admin rollback"):
        if action_id in self.active_actions:
            rec = self.active_actions[action_id]
            rec["status"] = "ROLLED_BACK"
            rec["rollback_reason"] = reason
            rec["rolled_back_at"] = time.time()
            return True, rec
        return False, None

global_rollback_manager = ResponseRollbackManager()
