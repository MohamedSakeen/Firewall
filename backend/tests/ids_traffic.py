"""Synthetic packet dictionaries for deterministic IDS detection tests.

No live capture, root privileges or Scapy sockets are needed.  Every case uses
a frozen clock and the same thresholds, so results are repeatable.  The cases
are deliberately modest in scope: they demonstrate the documented detectors,
not a claim that all attacks are detected.
"""

from dataclasses import dataclass

FROZEN_NOW = 1_700_000_000.0

# Deterministic overrides so each documented case crosses exactly one rule.
THRESHOLD_OVERRIDES = {
    "RECON-001": 20,   # distinct TCP ports for a port scan
    "RECON-002": 1000,  # keep the aggressive scan rule quiet in these cases
    "FLD-001": 20,     # SYN packets in the window
    "FLD-002": 25,     # UDP packets in the window
}


@dataclass(frozen=True)
class TrafficCase:
    name: str
    description: str
    packets: tuple
    expected_rule_ids: tuple


def tcp_packet(src_ip, dst_port, flags="S", dst_ip="198.51.100.20"):
    return {
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": 50000,
        "dst_port": int(dst_port),
        "protocol": "TCP",
        "tcp_flags": flags,
    }


def udp_packet(src_ip, dst_port, dst_ip="198.51.100.20"):
    return {
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": 50000,
        "dst_port": int(dst_port),
        "protocol": "UDP",
        "tcp_flags": None,
    }


def port_scan_packets(src_ip="198.51.100.10", count=42):
    """ACK sweep across many distinct ports: a scan, not a SYN flood."""
    return tuple(
        tcp_packet(src_ip, 1024 + index, flags="A")
        for index in range(count)
    )


def syn_flood_packets(src_ip="198.51.100.11", count=25):
    """SYN-only burst against one port from one source."""
    return tuple(
        tcp_packet(src_ip, 443, flags="S")
        for _ in range(count)
    )


def udp_flood_packets(src_ip="198.51.100.12", count=30):
    """UDP volume from one source; a volumetric signal only."""
    return tuple(
        udp_packet(src_ip, 53)
        for _ in range(count)
    )


def benign_packets():
    """Ordinary HTTPS retries, a completed handshake, and small DNS traffic."""
    packets = [tcp_packet("198.51.100.13", 443, flags="S") for _ in range(8)]
    packets.append(tcp_packet("198.51.100.13", 443, flags="SA"))
    packets.extend(udp_packet("198.51.100.14", 53) for _ in range(10))
    return tuple(packets)


CASES = (
    TrafficCase(
        name="port_scan",
        description="42 distinct ports in one window",
        packets=port_scan_packets(),
        expected_rule_ids=("RECON-001",),
    ),
    TrafficCase(
        name="syn_flood",
        description="25 SYN-only packets in one window",
        packets=syn_flood_packets(),
        expected_rule_ids=("FLD-001",),
    ),
    TrafficCase(
        name="udp_flood",
        description="30 UDP packets in one window",
        packets=udp_flood_packets(),
        expected_rule_ids=("FLD-002",),
    ),
    TrafficCase(
        name="benign",
        description="normal HTTPS and DNS traffic must not alert",
        packets=benign_packets(),
        expected_rule_ids=(),
    ),
)


def case_by_name(name):
    return next(case for case in CASES if case.name == name)
