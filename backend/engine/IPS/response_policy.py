import json

with open('backend/rules/IPS/response_policy.json', 'r') as f:
    ips_rules = json.load(f)

def get_response_policy(severity):
    for rule in ips_rules:
        if rule['severity'] == severity:
            return rule

    return None
