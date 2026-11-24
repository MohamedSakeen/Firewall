from pathlib import Path
import json

from .recon_detector import detect_port_scan
from .flood_detector import detect_syn_flood
from .alert_manager import create_alert

BASE = Path(__file__).resolve().parent.parent / "rules" / "IDS"

with (BASE / "recon_rules.json").open() as file:
    recon_rules = json.load(file)

with (BASE / "flood_rules.json").open() as file:
    flood_rules = json.load(file)

def run_detection_pipeline(packet, raw_packet):
<<<<<<< HEAD
    alerts = []
    for rule in recon_rules:
        if detect_port_scan(packet, rule):
            alerts.append(create_alert(
=======
    for rule in recon_rules:
        if detect_port_scan(packet, rule):
            create_alert(
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
                rule["name"],
                rule["severity"],
                packet["src_ip"],
                rule["score"]
<<<<<<< HEAD
            ))
    for rule in flood_rules:
        if detect_syn_flood(packet, raw_packet, rule):
            alerts.append(create_alert(
=======
            )
    for rule in flood_rules:
        if detect_syn_flood(packet, raw_packet, rule):
            create_alert(
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
                rule["name"],
                rule["severity"],
                packet["src_ip"],
                rule["score"]
<<<<<<< HEAD
            ))
    return alerts
=======
            )
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
