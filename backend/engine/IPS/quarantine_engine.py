from engine.IPS.block_manager import block_ip
from engine.IPS.ban_tracker import add_ban

def quarantine_ip(ip, duration, reason):
    block_ip(ip)
    add_ban(ip, duration, reason)
    print(f"[IPS QUARANTINED] {ip}")