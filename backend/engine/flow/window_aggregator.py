import time
import threading

class WindowAggregator:
    """
    Aggregates flow metrics over sliding time windows (1s, 10s, 1m, 5m, 1h).
    Enables multi-scale burst and slow-rate anomaly detection.
    """
    WINDOWS = {
        "1s": 1,
        "10s": 10,
        "1m": 60,
        "5m": 300,
        "1h": 3600
    }

    def __init__(self):
        self.flow_samples = []  # tuple: (timestamp, flow_dict)
        self._lock = threading.Lock()

    def add_flow_sample(self, flow_dict):
        now = time.time()
        with self._lock:
            self.flow_samples.append((now, flow_dict))
            # Keep up to 1 hour of samples
            cutoff = now - 3600
            self.flow_samples = [s for s in self.flow_samples if s[0] >= cutoff]

    def get_window_metrics(self, window_key="1m", asset_ip=None):
        window_seconds = self.WINDOWS.get(window_key, 60)
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            relevant = [s[1] for s in self.flow_samples if s[0] >= cutoff]

        if asset_ip:
            relevant = [f for f in relevant if f["src_ip"] == asset_ip or f["dst_ip"] == asset_ip]

        if not relevant:
            return {
                "window": window_key,
                "asset_ip": asset_ip,
                "flow_count": 0,
                "total_packets": 0,
                "total_bytes": 0,
                "avg_duration": 0.0,
                "syn_ratio": 0.0,
                "rst_ratio": 0.0
            }

        total_pkts = sum(f["packet_count"] for f in relevant)
        total_bytes = sum(f["bytes_sent"] + f["bytes_received"] for f in relevant)
        total_syn = sum(f["syn_count"] for f in relevant)
        total_rst = sum(f["rst_count"] for f in relevant)

        return {
            "window": window_key,
            "asset_ip": asset_ip,
            "flow_count": len(relevant),
            "total_packets": total_pkts,
            "total_bytes": total_bytes,
            "avg_duration": round(sum(f["duration"] for f in relevant) / len(relevant), 4),
            "syn_ratio": round(total_syn / max(1, total_pkts), 4),
            "rst_ratio": round(total_rst / max(1, total_pkts), 4)
        }

global_window_aggregator = WindowAggregator()
