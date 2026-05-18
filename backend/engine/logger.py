from datetime import datetime 
import json

from zope import event

def log_firewall_event(packet,decision):
    event = {
        "timestamp": str(datetime.now()),
        "src_ip": packet["src_ip"],
        "dst_ip": packet["dst_ip"],
        "protocol": packet["protocol"],
        "port": packet["dst_port"],
        "action": decision["action"]
    }

    with open(
            r"logs\firewall_events.log",
            "a"
        ) as file:

            file.write(
                json.dumps(event) + "\n"
            )