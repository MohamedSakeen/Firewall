import logging
import subprocess

from engine.firewall.blocker import block_ip as _block_ip
from engine.firewall.blocker import unblock_ip as _unblock_ip

logger = logging.getLogger(__name__)


def block_ip(ip):
    result = _block_ip(ip, runner=subprocess.run)
    if not result["ok"]:
        logger.warning("IPS block failed: %s", result["message"])
    return result


def unblock_ip(ip):
    result = _unblock_ip(ip, runner=subprocess.run)
    if not result["ok"]:
        logger.warning("IPS unblock failed: %s", result["message"])
    return result
