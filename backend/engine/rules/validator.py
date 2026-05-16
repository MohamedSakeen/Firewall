REQUIRED_FILEDS = [
    "name",
    "type",
    "severity",
    "threshold"
    ]

def validate_rules(rule):
    for field in REQUIRED_FILEDS:
        if field not in REQUIRED_FILEDS:
            return False
    return True