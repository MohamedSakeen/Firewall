from time import time
from webbrowser import get
from engine.IPS.ban_tracker import get_ban, remove_ban

def cleanup_expired_bans():
    current_time = time()
    expired = []
    for ip, data in get_ban().items():
        if current_time - data['start_time'] >= data['duration']:
            expired.append(ip)
    for ip in expired:
        remove_ban(ip)
        print(f"[UNBLOCKED] {ip}")