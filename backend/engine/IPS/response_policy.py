import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "rules" / "IPS"

with (BASE / "ips_rules.json").open() as f:
    ips_rules = json.load(f)

def get_response_policy(severity):
    for rule in ips_rules:
        if rule['severity'] == severity:
            return rule

    return None
