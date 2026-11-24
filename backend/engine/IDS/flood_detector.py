from scapy.layers.inet import TCP

from engine.IDS.results import DetectionResult
from engine.IDS.time_window import filter_recent_events
from engine.IDS.tracker import add_events, get_events

SYN_FLAG = 0x02
SYN_DETECTOR_KEY = "flood:tcp_syn"
UDP_DETECTOR_KEY = "flood:udp_packets"


def _is_syn_only(flags):
    """True only for an unadorned SYN, never SYN+ACK or other flag combinations."""
    if flags is None or isinstance(flags, bool):
        return False
    if isinstance(flags, int):
        return flags == SYN_FLAG
    return str(flags).strip().upper() in {"S", "SYN", "2", "0X02"}


def _normalized_syn(packet):
    if not isinstance(packet, dict):
        return False
    if str(packet.get("protocol") or "").upper() != "TCP":
        return False
    return _is_syn_only(packet.get("tcp_flags"))


def _raw_syn(raw_packet):
    if raw_packet is None:
        return False
    try:
        if not raw_packet.haslayer(TCP):
            return False
        return _is_syn_only(raw_packet[TCP].flags)
    except (AttributeError, KeyError, TypeError):
        return False


def _observation_count(key, rule, now, metadata):
    add_events(key, metadata, timestamp=now)
    recent = filter_recent_events(get_events(key), int(rule["time_window"]), now=now)
    return len(recent)


def evaluate_syn_flood(packet, rule, raw_packet=None, now=None):
    """Count SYN-only packets from one source in the rule window."""
    threshold = int(rule["threshold"])
    window = int(rule["time_window"])
    src_ip = packet.get("src_ip") if isinstance(packet, dict) else None
    is_syn = _normalized_syn(packet) or (
        not (isinstance(packet, dict) and packet.get("tcp_flags")) and _raw_syn(raw_packet)
    )
    observed = 0
    if src_ip and is_syn:
        observed = _observation_count(f"{src_ip}_syn", rule, now, {"syn": True})
    return DetectionResult(
        matched=observed >= threshold,
        detector=SYN_DETECTOR_KEY,
        rule_id=rule["id"],
        observed=observed,
        threshold=threshold,
        window_seconds=window,
    )


def detect_syn_flood(packet, raw_packet, rule, now=None):
    """Boolean compatibility wrapper around evaluate_syn_flood."""
    return evaluate_syn_flood(packet, rule, raw_packet=raw_packet, now=now).matched


def evaluate_udp_flood(packet, rule, now=None):
    """Count UDP packets from one source in the rule window.

    This is a volume signal only; it does not claim to verify amplification or
    whether destination ports are actually closed.
    """
    threshold = int(rule["threshold"])
    window = int(rule["time_window"])
    src_ip = packet.get("src_ip") if isinstance(packet, dict) else None
    is_udp = isinstance(packet, dict) and str(packet.get("protocol") or "").upper() == "UDP"
    observed = 0
    if src_ip and is_udp:
        observed = _observation_count(f"{src_ip}_udp", rule, now, {"udp": True})
    return DetectionResult(
        matched=observed >= threshold,
        detector=UDP_DETECTOR_KEY,
        rule_id=rule["id"],
        observed=observed,
        threshold=threshold,
        window_seconds=window,
    )


def detect_udp_flood(packet, rule, raw_packet=None, now=None):
    """Boolean compatibility wrapper around evaluate_udp_flood."""
    return evaluate_udp_flood(packet, rule, now=now).matched
