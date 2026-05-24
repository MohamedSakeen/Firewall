from collections import defaultdict
from time import time

banned_ips = defaultdict(dict)

def add_ban(ip, duration, reason):
    banned_ips[ip] = {
        "start_time": time(),
        "duration": duration,
        "reason": reason
    }

def get_ban(ip):
    return banned_ips.get(ip, None)

def remove_ban(ip):
    if ip in banned_ips:
        del banned_ips[ip]