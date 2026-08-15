import time
import threading
from engine.flow.flow_model import Flow

class FlowTracker:
    """
    Thread-safe container managing active and historic network flows.
    Handles flow creation, state transitions, timeout cleanups, and export.
    """
    def __init__(self, idle_timeout=30.0):
        self.active_flows = {}  # flow_id -> Flow
        self.closed_flows = []  # List of past closed flows
        self.idle_timeout = idle_timeout
        self._lock = threading.Lock()

    def process_packet(self, normalized_packet):
        src_ip = normalized_packet.get("src_ip")
        dst_ip = normalized_packet.get("dst_ip")
        src_port = normalized_packet.get("src_port")
        dst_port = normalized_packet.get("dst_port")
        protocol = normalized_packet.get("protocol", "IP")

        if not src_ip or not dst_ip:
            return None

        flow_id = Flow.generate_flow_id(src_ip, dst_ip, src_port, dst_port, protocol)

        with self._lock:
            if flow_id not in self.active_flows:
                flow = Flow(src_ip, dst_ip, src_port, dst_port, protocol)
                self.active_flows[flow_id] = flow
            else:
                flow = self.active_flows[flow_id]

            flow.update_with_packet(normalized_packet)

            if flow.state == "CLOSED":
                self.closed_flows.append(flow)
                del self.active_flows[flow_id]
                # Cap closed flows memory buffer
                if len(self.closed_flows) > 5000:
                    self.closed_flows.pop(0)

            return flow

    def cleanup_idle_flows(self):
        """Marks flows idle/closed after idle timeout."""
        now = time.time()
        with self._lock:
            expired_ids = []
            for flow_id, flow in self.active_flows.items():
                if now - flow.last_packet_time > self.idle_timeout:
                    flow.state = "IDLE"
                    expired_ids.append(flow_id)

            for fid in expired_ids:
                flow = self.active_flows.pop(fid)
                self.closed_flows.append(flow)

    def get_all_active_flows(self):
        with self._lock:
            return [flow.to_dict() for flow in self.active_flows.values()]

    def get_flow_count(self):
        with self._lock:
            return len(self.active_flows)

# Global singleton flow tracker instance
global_flow_tracker = FlowTracker()
