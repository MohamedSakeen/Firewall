import math
from collections import Counter
from engine.features.context_builder import global_context_builder

def calculate_shannon_entropy(data_list):
    """Calculates Shannon entropy for categorical lists (e.g. IPs, ports)."""
    if not data_list:
        return 0.0
    counts = Counter(data_list)
    total = len(data_list)
    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)

class FeatureExtractor:
    """
    Extracts statistical, behavioral, and entropy features from individual flows or flow windows.
    """
    def __init__(self, context_builder=None):
        self.context_builder = context_builder or global_context_builder

    def extract_from_flow(self, flow_dict):
        """Extracts features from a single flow dict."""
        pkts = flow_dict.get("packet_count", 1)
        dur = max(0.001, flow_dict.get("duration", 0.001))
        bytes_total = flow_dict.get("bytes_sent", 0) + flow_dict.get("bytes_received", 0)

        context = self.context_builder.build_context(
            flow_dict.get("src_ip"),
            flow_dict.get("dst_ip"),
            flow_dict.get("dst_port")
        )

        return {
            "flow_id": flow_dict.get("flow_id"),
            "packets_per_second": round(pkts / dur, 2),
            "bytes_per_second": round(bytes_total / dur, 2),
            "avg_packet_size": flow_dict.get("packet_size_mean", 0),
            "packet_size_variance": flow_dict.get("packet_size_std", 0) ** 2,
            "syn_ratio": round(flow_dict.get("syn_count", 0) / pkts, 4),
            "rst_ratio": round(flow_dict.get("rst_count", 0) / pkts, 4),
            "failed_connection": flow_dict.get("rst_count", 0) > 0 or (flow_dict.get("syn_count", 0) > 0 and flow_dict.get("ack_count", 0) == 0),
            **context
        }

    def extract_from_flow_window(self, flow_list):
        """Extracts windowed behavioral & entropy features across multiple flows."""
        if not flow_list:
            return {}

        dst_ips = [f.get("dst_ip") for f in flow_list if f.get("dst_ip")]
        dst_ports = [f.get("dst_port") for f in flow_list if f.get("dst_port")]
        
        total_pkts = sum(f.get("packet_count", 0) for f in flow_list)
        total_bytes = sum(f.get("bytes_sent", 0) + f.get("bytes_received", 0) for f in flow_list)
        total_syn = sum(f.get("syn_count", 0) for f in flow_list)
        total_rst = sum(f.get("rst_count", 0) for f in flow_list)

        return {
            "flow_count": len(flow_list),
            "unique_destinations": len(set(dst_ips)),
            "unique_ports": len(set(dst_ports)),
            "destination_entropy": calculate_shannon_entropy(dst_ips),
            "port_entropy": calculate_shannon_entropy(dst_ports),
            "total_packets": total_pkts,
            "total_bytes": total_bytes,
            "syn_ratio": round(total_syn / max(1, total_pkts), 4),
            "rst_ratio": round(total_rst / max(1, total_pkts), 4)
        }

global_feature_extractor = FeatureExtractor()
