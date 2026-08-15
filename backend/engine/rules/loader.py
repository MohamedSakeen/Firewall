import json
import os

def load_json(folder_path):
    """
    Loads and aggregates JSON rule files from folder_path directory.
    Handles both list of rules and dictionary rule definitions.
    """
    rules = []
    if not os.path.exists(folder_path):
        return rules

    file_names = os.listdir(folder_path) if isinstance(folder_path, str) else folder_path
    for file_name in file_names:
        if file_name.endswith(".json"):
            full_path = os.path.join(folder_path, file_name) if isinstance(folder_path, str) else file_name
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        rules.extend(data)
                    elif isinstance(data, dict):
                        rules.append(data)
            except Exception as e:
                print(f"[RULES LOADER] Error parsing rule file {file_name}: {e}")

    return rules
