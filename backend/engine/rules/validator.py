REQUIRED_FIELDS = [
    "name",
    "type",
    "severity",
    "threshold"
]

def validate_rules(rule):
    """
    Validates mandatory schema attributes for enterprise detection rules.
    """
    if not isinstance(rule, dict):
        return False
    for field in REQUIRED_FIELDS:
        if field not in rule:
            return False
    return True