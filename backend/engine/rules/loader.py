import json
import os

def load_json(folder_path):
    rules = []
    for file_name in folder_path:
        if file_name.endswith(".json"):
            full_path = os.path.join(
                folder_path,
                file_name
            )
            with open(full_path,"r") as f:
                data = json.load(f)
                rules.extend(data)

    return rules
