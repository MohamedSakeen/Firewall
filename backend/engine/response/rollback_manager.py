import logging
import time

logger = logging.getLogger(__name__)


def safe_unblock(ip):
    """Default unblock wrapper. Never accepts or builds a shell command."""
    from engine.IPS.unblock_manager import unblock_ip

    return unblock_ip(ip)


class ResponseRollbackManager:
    """
    Tracks active defense actions, expiration timers, and explicit rollback
    instructions. Ensures temporary blocks and rate limits do not remain
    active indefinitely. Rollback calls an injected unblock function, never a
    shell string.
    """
    def __init__(self, unblock_func=None):
        self.active_actions = {}  # action_id -> dict
        self.unblock_func = unblock_func or safe_unblock

    def register_action(
        self,
        action_id,
        target_ip,
        action_type="TEMPORARY_BLOCK",
        duration_seconds=600,
        rollback_command=None,
        rollback_func=None,
    ):
        now = time.time()
        try:
            duration = float(duration_seconds)
        except (TypeError, ValueError, OverflowError):
            duration = 600.0
        if duration <= 0:
            duration = 600.0
        record = {
            "action_id": action_id,
            "target_ip": target_ip,
            "action_type": action_type,
            "duration_seconds": duration,
            "created_at": now,
            "expires_at": now + duration,
            # Kept for reporting only; rollback uses unblock_func / rollback_func.
            "rollback_command": rollback_command or f"REMOVE_RULE_{action_id}",
            "rollback_func": rollback_func,
            "status": "ACTIVE",
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

    def _unblock(self, record):
        callback = record.get("rollback_func") or self.unblock_func
        return callback(record["target_ip"])

    def execute_manual_rollback(self, action_id, reason="Manual admin rollback"):
        """Unblock the target and mark the record rolled back on success."""
        if action_id not in self.active_actions:
            return False, None
        record = self.active_actions[action_id]
        try:
            result = self._unblock(record)
        except Exception:
            logger.exception("rollback callback failed for action %s", action_id)
            record["rollback_error"] = "callback failed"
            return False, record
        ok = isinstance(result, dict) and bool(result.get("ok"))
        if not ok:
            message = (result or {}).get("message", "unknown unblock error")
            logger.warning("rollback unblock failed for %s: %s", action_id, message)
            record["rollback_error"] = message
            return False, record
        record["status"] = "ROLLED_BACK"
        record["rollback_reason"] = reason
        record["rolled_back_at"] = time.time()
        record["rollback_result"] = result
        return True, record

    def mark_rolled_back_for_ip(self, target_ip, reason="Manual unblock"):
        """Mark active records for an IP as rolled back after an unblock."""
        updated = []
        for record in self.active_actions.values():
            if record["target_ip"] != target_ip or record["status"] != "ACTIVE":
                continue
            record["status"] = "ROLLED_BACK"
            record["rollback_reason"] = reason
            record["rolled_back_at"] = time.time()
            updated.append(record)
        return updated


global_rollback_manager = ResponseRollbackManager()
