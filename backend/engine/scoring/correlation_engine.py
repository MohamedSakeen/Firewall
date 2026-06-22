import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "rules" / "scoring"

with (BASE / "correlation_rules.json").open() as file:
    correlation_rules = json.load(file)

def correlate_events(events):
    attack_names = [
        event["attack"] for event in events
    ]

    correlate = []

    for rule in correlation_rules:
        if all(
            condition in attack_names for condition in rule["conditions"]
        ):
            correlate.append(rule)

    return correlate