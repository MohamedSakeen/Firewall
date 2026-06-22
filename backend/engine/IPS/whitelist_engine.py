import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "rules" / "IPS"

with (BASE / "whitelist.json").open() as f:
    whitelist = json.load(f)

def is_whitelisted(ip):
    return ip in whitelist