import ipaddress
import json
import os
import threading
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path

MAX_PACKETS = 2000
MAX_ALERTS = 2000
MAX_EVENTS = 2000
MAX_LOGS = 2000
MAX_DRIFT = 200
MAX_BLOCKS = 500

RULES_DIR = Path(__file__).resolve().parents[2] / "engine" / "rules"


def _parse_networks(raw):
    networks = []
    for item in (raw or "").split(","):
        item = item.strip()
        if not item:
            continue
        try:
            networks.append(ipaddress.ip_network(item, strict=False))
        except ValueError:
            continue
    return networks


LOCAL_NETWORKS = _parse_networks(
    os.getenv("NETGUARD_LOCAL_NETWORKS", "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16")
)


def _is_local(ip):
    if not ip:
        return False
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(address in network for network in LOCAL_NETWORKS)


def _direction(src_ip, dst_ip):
    src_local = _is_local(src_ip)
    dst_local = _is_local(dst_ip)
    if src_local and dst_local:
        return "INTERNAL"
    if dst_local:
        return "RX"
    if src_local:
        return "TX"
    return "OTHER"


packet_direction = _direction


def _iso_time(timestamp=None):
    return datetime.fromtimestamp(timestamp if timestamp is not None else time.time()).isoformat(sep=" ")


def _count_entries(value):
    if isinstance(value, dict):
        return sum(_count_entries(item) for item in value.values())
    if isinstance(value, list):
        if all(not isinstance(item, (dict, list)) for item in value):
            return len(value)
        return sum(_count_entries(item) for item in value)
    return 1


def count_rule_entries():
    total = 0
    if not RULES_DIR.exists():
        return total
    for path in RULES_DIR.rglob("*.json"):
        try:
            with path.open(encoding="utf-8") as handle:
                total += _count_entries(json.load(handle))
        except (OSError, ValueError):
            continue
    return total


class LiveTelemetryStore:
    def __init__(self):
        self._lock = threading.RLock()
        self.started_at = time.time()
        self.started_monotonic = time.monotonic()
        self.packets = deque(maxlen=MAX_PACKETS)
        self.alerts = deque(maxlen=MAX_ALERTS)
        self.events = deque(maxlen=MAX_EVENTS)
        self.logs = defaultdict(lambda: deque(maxlen=MAX_LOGS))
        self.assets = {}
        self.drift = deque(maxlen=MAX_DRIFT)
        self.blocks = deque(maxlen=MAX_BLOCKS)
        self.packet_count = 0
        self.rx_count = 0
        self.tx_count = 0
        self._alert_counter = 0
        self._baseline_snapshot = {}
        self._reported_drift = set()

    def record_packet(self, packet, size=None, decision=None, score=None):
        timestamp = time.time()
        src_ip = packet.get("src_ip")
        dst_ip = packet.get("dst_ip")
        direction = _direction(src_ip, dst_ip)
        entry = {
            "time": _iso_time(timestamp),
            "timestamp": timestamp,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": packet.get("src_port"),
            "dst_port": packet.get("dst_port"),
            "protocol": packet.get("protocol"),
            "tcp_flags": str(packet["tcp_flags"]) if packet.get("tcp_flags") is not None else None,
            "size": size if size is not None else packet.get("size"),
            "payload_size": packet.get("payload_size"),
            "direction": direction,
            "decision": decision,
            "score": score,
        }

        with self._lock:
            self.packets.append(entry)
            self.packet_count += 1
            if direction in ("RX", "INTERNAL"):
                self.rx_count += 1
            if direction in ("TX", "INTERNAL"):
                self.tx_count += 1

            for ip in (src_ip, dst_ip):
                if not ip:
                    continue
                observation = self.assets.setdefault(ip, {
                    "ip": ip,
                    "first_seen": timestamp,
                    "last_seen": timestamp,
                    "packet_count": 0,
                    "ports": set(),
                    "protocols": defaultdict(int),
                    "bytes": 0,
                })
                observation["last_seen"] = timestamp
                observation["packet_count"] += 1
                observation["bytes"] += entry["size"] or 0
                if packet.get("protocol"):
                    observation["protocols"][str(packet["protocol"])] += 1
                if ip == dst_ip and packet.get("dst_port") is not None:
                    observation["ports"].add(int(packet["dst_port"]))

            self._update_drift(timestamp)
            self.logs["traffic"].append({
                "timestamp": _iso_time(timestamp),
                "level": "INFO",
                "category": "traffic",
                "message": json.dumps(entry, default=str),
            })

        return entry

    def _update_drift(self, timestamp):
        for ip, observation in self.assets.items():
            ports = set(observation["ports"])
            if observation["packet_count"] < 20 or not ports:
                continue
            baseline = self._baseline_snapshot.get(ip)
            if baseline is None:
                self._baseline_snapshot[ip] = set(ports)
                continue
            new_ports = sorted(ports - baseline)
            for port in new_ports:
                key = (ip, port)
                if key in self._reported_drift:
                    continue
                self._reported_drift.add(key)
                self.drift.append({
                    "asset_ip": ip,
                    "port": port,
                    "drift_type": "SERVICE_EXPANSION",
                    "detected_at": timestamp,
                    "details": f"New destination port {port} observed after baseline formation",
                    "status": "OBSERVED",
                    "action_required": "REVIEW_ASSET_BASELINE",
                })

    def record_alert(self, alert, destination_ip=None, destination_port=None, protocol=None, action=None):
        timestamp = time.time()
        with self._lock:
            self._alert_counter += 1
            record = dict(alert)
            record["alert_id"] = f"ALT-{self._alert_counter:06d}"
            record["event_time"] = _iso_time(timestamp)
            record["action"] = action
            self.alerts.append(record)

            event = {
                "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
                "timestamp": timestamp,
                "time_str": _iso_time(timestamp),
                "event_type": str(record.get("attack", "IDS_ALERT")).upper().replace(" ", "_"),
                "source_ip": record.get("src_ip"),
                "destination_ip": destination_ip,
                "source_port": None,
                "destination_port": destination_port,
                "protocol": protocol,
                "asset_id": f"ASSET-{destination_ip}" if destination_ip else None,
                "flow_id": None,
                "session_id": None,
                "detector": "IDS",
                "severity": str(record.get("severity", "UNKNOWN")).upper(),
                "anomaly_score": None,
                "threat_score": record.get("score"),
                "confidence": None,
                "evidence": [
                    f"Signature: {record.get('attack')}",
                    f"Rule score: {record.get('score')}",
                ],
                "source_category": "ids",
                "recommended_action": action or "MONITOR",
            }
            self.events.append(event)
            self.logs["alerts"].append({
                "timestamp": record.get("timestamp") or _iso_time(timestamp),
                "level": event["severity"],
                "category": "alerts",
                "message": f"{record.get('attack')} from {record.get('src_ip')} (score {record.get('score')})",
            })
        return record, event

    def record_security_event(self, event):
        with self._lock:
            self.events.append(event)
            self.logs["correlation"].append({
                "timestamp": event.get("time_str") or _iso_time(),
                "level": event.get("severity") or "INFO",
                "category": "correlation",
                "message": f"{event.get('event_type')} from {event.get('source_ip')}",
            })
        return event

    def record_block(self, ip, reason, duration=None, source="manual"):
        entry = {
            "ip": ip,
            "reason": reason,
            "duration": duration,
            "source": source,
            "blocked_at": _iso_time(),
            "timestamp": time.time(),
        }
        with self._lock:
            self.blocks.append(entry)
            self.logs["ips"].append({
                "timestamp": entry["blocked_at"],
                "level": "INFO",
                "category": "ips",
                "message": f"Blocked {ip}: {reason}",
            })
        return entry

    def record_unblock(self, ip):
        with self._lock:
            self.blocks = deque((b for b in self.blocks if b["ip"] != ip), maxlen=MAX_BLOCKS)
            self.logs["ips"].append({
                "timestamp": _iso_time(),
                "level": "INFO",
                "category": "ips",
                "message": f"Unblocked {ip}",
            })

    def record_log(self, category, message, level="INFO"):
        with self._lock:
            self.logs[category].append({
                "timestamp": _iso_time(),
                "level": level,
                "category": category,
                "message": str(message),
            })

    def packets_snapshot(self, limit=200):
        with self._lock:
            return list(self.packets)[-limit:]

    def alerts_snapshot(self, limit=200):
        with self._lock:
            return list(self.alerts)[-limit:]

    def events_snapshot(self, limit=200):
        with self._lock:
            return list(self.events)[-limit:]

    def logs_snapshot(self):
        with self._lock:
            return {name: list(entries) for name, entries in self.logs.items()}

    def blocks_snapshot(self):
        with self._lock:
            return list(self.blocks)

    def drift_snapshot(self):
        with self._lock:
            return list(self.drift)

    def bandwidth_data(self):
        buckets = defaultdict(lambda: {"rx": 0, "tx": 0})
        for entry in self.packets_snapshot(MAX_PACKETS):
            try:
                minute = datetime.fromtimestamp(entry["timestamp"]).strftime("%H:%M")
            except (KeyError, TypeError, ValueError):
                continue
            if entry.get("direction") in ("RX", "INTERNAL"):
                buckets[minute]["rx"] += 1
            if entry.get("direction") in ("TX", "INTERNAL"):
                buckets[minute]["tx"] += 1
        return [{"time": key, **value} for key, value in sorted(buckets.items())]

    def baselines(self):
        with self._lock:
            observations = []
            for ip, observation in self.assets.items():
                observations.append({
                    "ip": ip,
                    "sample_count": observation["packet_count"],
                    "normal_services": sorted(observation["ports"]),
                    "avg_pps": round(
                        observation["packet_count"] / max(0.001, observation["last_seen"] - observation["first_seen"]),
                        2,
                    ),
                    "confidence": round(min(0.99, 0.5 + (max(1, observation["packet_count"]).bit_length() / 20)), 2),
                    "status": "STABLE_READY" if observation["packet_count"] >= 20 and observation["ports"] else "COLLECTING",
                    "protocols": dict(observation["protocols"]),
                    "bytes": observation["bytes"],
                    "first_seen": _iso_time(observation["first_seen"]),
                    "last_seen": _iso_time(observation["last_seen"]),
                })
            return observations

    def uptime(self):
        elapsed = int(time.monotonic() - self.started_monotonic)
        days, remainder = divmod(elapsed, 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, seconds = divmod(remainder, 60)
        if days:
            return f"{days}d {hours:02d}h"
        if hours:
            return f"{hours}h {minutes:02d}m"
        return f"{minutes}m {seconds:02d}s"


global_live_store = LiveTelemetryStore()
