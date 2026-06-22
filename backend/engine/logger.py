from datetime import datetime 
import json
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"


def log_firewall_event(packet, decision):
    event = {
        "timestamp": str(datetime.now()),
        "src_ip": packet["src_ip"],
        "dst_ip": packet["dst_ip"],
        "protocol": packet["protocol"],
        "port": packet["dst_port"],
        "action": decision["action"]
    }

    with (LOG_DIR / "firewall_events.log").open("a") as file:
        file.write(json.dumps(event) + "\n")