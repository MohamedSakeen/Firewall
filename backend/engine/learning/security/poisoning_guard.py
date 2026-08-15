class PoisoningGuard:
    """
    Guards against slow behavioral manipulation by capping max variance and delta per update window.
    """
    def __init__(self, max_delta_pct=0.25):
        self.max_delta_pct = max_delta_pct

    def check_bounded_update(self, current_val, proposed_val):
        """
        Ensures proposed new metric value does not jump by more than max_delta_pct in a single update.
        Returns (bounded_val, was_clamped, reason).
        """
        if current_val <= 0:
            return proposed_val, False, "Initial value set"

        delta = proposed_val - current_val
        max_allowed_change = current_val * self.max_delta_pct

        if abs(delta) > max_allowed_change:
            clamped_delta = max_allowed_change if delta > 0 else -max_allowed_change
            bounded_val = current_val + clamped_delta
            return bounded_val, True, f"CLAMPED: Update delta ({delta:.2f}) exceeded max step bound ({max_allowed_change:.2f})"

        return proposed_val, False, "Update within safe bounds"

global_poisoning_guard = PoisoningGuard()
