import os
import sys
from datetime import datetime
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"

BLOCKED_IPS = set()

def log_block(ip):
    with (LOG_DIR / "blocked.log").open("a") as f:
        f.write(f"{datetime.now()} - Blocked IP: {ip}\n")

def block_ip(ip):
    if ip in BLOCKED_IPS:
        return

    if sys.platform == "win32":
        command = (f'netsh advfirewall firewall add rule '
                   f'name="Block_{ip}" '
                   f'dir=in action=block remoteip={ip}')
        os.system(command)
    else:
        print(f"[STUB] block_ip({ip}) — iptables/netsh not available on {sys.platform}")

    BLOCKED_IPS.add(ip)
    log_block(ip)
    print(f"[IPS] Blocked IP: {ip}")