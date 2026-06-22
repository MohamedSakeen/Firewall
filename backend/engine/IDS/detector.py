from collections import defaultdict
from datetime import datetime
from pathlib import Path

from engine.firewall.blocker import block_ip

LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"

scan_tracker = defaultdict(set)

PORT_SCAN_THRESHOLD = 10

def detect_port_scan(src_ip, dst_port):
    scan_tracker[src_ip].add(dst_port)
    if len(scan_tracker[src_ip]) > PORT_SCAN_THRESHOLD:
        log_alert(f"Port scan detected from {src_ip} ")
        block_ip(src_ip)
        return True
    return False

def log_alert(message):
    with (LOG_DIR / "alerts.log").open("a") as f:
        f.write(f"{datetime.now()} - {message}\n")
