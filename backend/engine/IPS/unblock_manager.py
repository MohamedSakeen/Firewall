from time import time
from engine.IPS.ban_tracker import banned_ips, remove_ban

def cleanup_expired_bans():
    current_time = time()
    expired = []
    for ip, data in banned_ips.items():
        if current_time - data['start_time'] >= data['duration']:
            expired.append(ip)
    for ip in expired:
        remove_ban(ip)
        print(f"[UNBLOCKED] {ip}")