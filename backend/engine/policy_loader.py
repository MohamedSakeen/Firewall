import json

def load_policy(path):
    with open(path, "r") as f:
        policies = json.load(f)

    policies.sort(key=lambda x: x["priority"])
    
    return policies