import json
with open('backend/rules/IPS/whitelist.json', 'r') as f:
    whitelist = json.load(f)

def is_whitelisted(ip):
    return ip in whitelist