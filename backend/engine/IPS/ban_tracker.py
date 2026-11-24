import threading
from collections import defaultdict
from time import time

banned_ips = defaultdict(dict)
_lock = threading.RLock()


def add_ban(ip, duration, reason):
    with _lock:
        banned_ips[ip] = {
            "start_time": time(),
            "duration": duration,
            "reason": reason,
        }


def get_ban(ip):
    with _lock:
        ban = banned_ips.get(ip)
        return dict(ban) if ban is not None else None


def remove_ban(ip):
    with _lock:
        banned_ips.pop(ip, None)


def is_expired(ip, now=None):
    ban = get_ban(ip)
    if not ban:
        return False
    try:
        return (time() if now is None else now) - float(ban["start_time"]) >= float(ban["duration"])
    except (KeyError, TypeError, ValueError):
        return False
