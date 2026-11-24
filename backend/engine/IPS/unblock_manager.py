import logging
from time import time

from engine.IPS.ban_tracker import banned_ips, remove_ban
from engine.firewall.blocker import unblock_ip as remove_os_rule

logger = logging.getLogger(__name__)


def cleanup_expired_bans(now=None):
    current_time = time() if now is None else now
    expired = []
    for ip, data in list(banned_ips.items()):
        try:
            is_expired = current_time - float(data["start_time"]) >= float(data["duration"])
        except (KeyError, TypeError, ValueError):
            continue
        if not is_expired:
            continue
        remove_ban(ip)
        result = remove_os_rule(ip)
        if not result.get("ok"):
            logger.warning("expired ban cleanup could not remove OS rule: %s", result["message"])
        expired.append(ip)
    return expired


def unblock_ip(ip):
    result = remove_os_rule(ip)
    remove_ban(ip)
    return result
