import os
from datetime import datetime

BLOCKED_IPS = set()

def log_block(ip):
    with open(r"P:\Firewall\backend\logs\blocked.log", "a") as f:
        f.write(f"{datetime.now()} - Blocked IP: {ip}\n")

def block_ip(ip):
    if ip in BLOCKED_IPS:
        return
    
    command = (f'netsh advfirewall firewall add rule' 
               f'name = "Block_{ip}"'
               f'dir=in action=block remoteip={ip}')
    
    os.system(command)
    BLOCKED_IPS.add(ip)
    log_block(ip)
    print(f"[IPS] Blocked IP: {ip}")