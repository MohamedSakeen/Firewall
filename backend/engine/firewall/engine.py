import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def _load_rules():
    # Try backend rules first, then project root rules
    candidates = [
        Path(__file__).parents[2] / "rules" / "firewall" / "rules.json",
        Path(__file__).parents[3] / "rules" / "firewall" / "rules.json",
    ]
    for p in candidates:
        try:
            if p.exists():
                with p.open("r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load rules from {p}: {e}")
            return {}
    logger.warning("No firewall rules file found; using empty rules set.")
    return {}


rules = _load_rules()

blocked_ips = rules.get("blocked_ips", [])
blocked_ports = rules.get("blocked_ports", [])

if not isinstance(blocked_ips, list):
    raise TypeError("rules['blocked_ips'] must be a list (or missing)")
if not isinstance(blocked_ports, list):
    raise TypeError("rules['blocked_ports'] must be a list (or missing)")


def check_packet(src_ip, dst_port):
    if src_ip in blocked_ips:
        return "Blocked IP Address"
    if dst_port in blocked_ports:
        return "Blocked Port"
    return "ALLOWED"