class ResponseSafetyValidator:
    """
    Validates candidate response actions against safety constraints (whitelist checks,
    critical asset protections, automation permissions, simulation impacts) before execution.
    """
    def __init__(self, protected_whitelists=None):
        self.protected_whitelists = protected_whitelists or ["127.0.0.1", "10.0.0.1", "192.168.1.1"]

    def validate_action(self, target_ip, action, asset_criticality="MEDIUM", simulation_result=None, automation_enabled=True):
        reasons = []

        if target_ip in self.protected_whitelists:
            return {
                "is_allowed": False,
                "status": "REJECTED_WHITELIST",
                "reason": f"Target IP {target_ip} is protected on system whitelist"
            }

        if action == "QUARANTINE" and asset_criticality == "CRITICAL":
            return {
                "is_allowed": False,
                "status": "REJECTED_CRITICAL_ASSET",
                "reason": "Indiscriminate quarantine of CRITICAL asset rejected; recommend TEMPORARY_BLOCK or RATE_LIMIT"
            }

        if not automation_enabled and action in ["QUARANTINE", "TEMPORARY_BLOCK"]:
            return {
                "is_allowed": False,
                "status": "REQUIRES_HUMAN_APPROVAL",
                "reason": "Automated enforcement disabled for high-impact actions; human approval required"
            }

        if simulation_result and simulation_result.get("recommendation") == "HIGH_RISK":
            return {
                "is_allowed": False,
                "status": "REJECTED_SIMULATION_HIGH_RISK",
                "reason": f"Policy simulation flagged high availability impact (FP rate {simulation_result.get('estimated_false_positive_rate', 0)}%)"
            }

        return {
            "is_allowed": True,
            "status": "PASSED_SAFETY_VALIDATION",
            "reason": "Action validated safe against all operational constraints"
        }

global_response_safety_validator = ResponseSafetyValidator()
