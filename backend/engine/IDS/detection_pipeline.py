from .recon_detector import detect_port_scan
from .flood_detector import detect_syn_flood
from .alert_manager import create_alert
import json

with open(
    r"rules\IDS\recon_rules.json"
) as file:

    recon_rules = json.load(file)

with open(
    r"rules\IDS\flood_rules.json"
) as file:

    flood_rules = json.load(file)

def run_detection_pipeline(packet, raw_packet):
    for rule in recon_rules:
        if detect_port_scan(packet, rule):
            create_alert(
                rule["name"],
                rule["severity"],
                packet["src_ip"],
                rule["score"]
            )
    for rule in flood_rules:
        if detect_syn_flood(packet, raw_packet, rule):
            create_alert(
                rule["name"],
                rule["severity"],
                packet["src_ip"],
                rule["score"]
            )
