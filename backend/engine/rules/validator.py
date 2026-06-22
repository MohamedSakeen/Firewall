REQUIRED_FIELDS = [
    "name",
    "type",
    "severity",
    "threshold"
]


def validate_rules(rule):
    for field in REQUIRED_FIELDS:
        if field not in rule:
            return False
    return True