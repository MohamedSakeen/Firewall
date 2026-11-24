from engine.IDS.results import DetectionResult
from engine.IDS.time_window import filter_recent_events
from engine.IDS.tracker import add_events, get_events

DETECTOR_KEY = "scan:tcp_ports"


def _target_port(packet):
    if not isinstance(packet, dict):
        return None
    protocol = packet.get("protocol")
    if protocol and str(protocol).upper() != "TCP":
        return None
    port = packet.get("dst_port")
    if port is None:
        return None
    try:
        return int(port)
    except (TypeError, ValueError):
        return None


def evaluate_port_scan(packet, rule, now=None):
    """Count distinct TCP destination ports from one source in the rule window."""
    threshold = int(rule["threshold"])
    window = int(rule["time_window"])
    src_ip = packet.get("src_ip") if isinstance(packet, dict) else None
    port = _target_port(packet)
    observed = 0
    if src_ip and port is not None:
        key = str(src_ip)
        add_events(key, {"port": port}, timestamp=now)
        recent = filter_recent_events(get_events(key), window, now=now)
        observed = len({event["data"].get("port") for event in recent})
    return DetectionResult(
        matched=observed >= threshold,
        detector=DETECTOR_KEY,
        rule_id=rule["id"],
        observed=observed,
        threshold=threshold,
        window_seconds=window,
    )


def detect_port_scan(packet, rule, now=None):
    """Boolean compatibility wrapper around evaluate_port_scan."""
    return evaluate_port_scan(packet, rule, now=now).matched
