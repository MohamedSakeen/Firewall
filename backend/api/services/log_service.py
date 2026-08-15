import json
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
RULES_DIR = Path(__file__).resolve().parent.parent.parent / "engine" / "rules"


def read_json_log(filename):
    path = LOG_DIR / filename
    if not path.exists():
        return []
    entries = []
    with path.open("r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return entries


def read_text_log(filename):
    path = LOG_DIR / filename
    if not path.exists():
        return []
    with path.open("r") as f:
        return [line.rstrip("\n") for line in f if line.strip()]


def count_lines(filename):
    path = LOG_DIR / filename
    if not path.exists():
        return 0
    with path.open("r") as f:
        return sum(1 for _ in f)


def read_json_file(path):
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json_file(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
