import json

with open("rules/scoring/correlation_rules.json") as file:
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