from collections import defaultdict
from datetime import datetime
from engine.firewall.blocker import block_ip
scan_tracker = defaultdict(set)

#detect port scan 
PORT_SCAN_THRESHOLD = 10
def detect_port_scan(src_ip,dst_port):
    scan_tracker[src_ip].add(dst_port)
    if len(scan_tracker[src_ip]) > PORT_SCAN_THRESHOLD:
        log_alert(f"Port scan detected from {src_ip} ")
        block_ip(src_ip)
        return True
    return False

def log_alert(message):
    with open(r"logs\alerts.log", "a") as f:
        f.write(f"{datetime.now()} - {message}\n")
