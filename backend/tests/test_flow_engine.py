import unittest
import time
from engine.flow.flow_model import Flow
from engine.flow.flow_tracker import FlowTracker
from engine.flow.window_aggregator import WindowAggregator

class TestFlowEngine(unittest.TestCase):
    def test_flow_canonical_id(self):
        id1 = Flow.generate_flow_id("10.0.0.1", "192.168.1.1", 1234, 80, "TCP")
        id2 = Flow.generate_flow_id("192.168.1.1", "10.0.0.1", 80, 1234, "TCP")
        self.assertEqual(id1, id2)

    def test_flow_tracker_lifecycle(self):
        tracker = FlowTracker(idle_timeout=1.0)
        pkt1 = {
            "src_ip": "10.0.0.5",
            "dst_ip": "10.0.0.10",
            "src_port": 5000,
            "dst_port": 80,
            "protocol": "TCP",
            "tcp_flags": "S",
            "payload_size": 64
        }
        flow = tracker.process_packet(pkt1)
        self.assertIsNotNone(flow)
        self.assertEqual(flow.state, "NEW")
        self.assertEqual(flow.packet_count, 1)

        pkt2 = {
            "src_ip": "10.0.0.10",
            "dst_ip": "10.0.0.5",
            "src_port": 80,
            "dst_port": 5000,
            "protocol": "TCP",
            "tcp_flags": "SA",
            "payload_size": 64
        }
        flow2 = tracker.process_packet(pkt2)
        self.assertEqual(flow2.state, "ACTIVE")
        self.assertEqual(flow2.packet_count, 2)

    def test_window_aggregator(self):
        agg = WindowAggregator()
        f_dict = {
            "src_ip": "10.0.0.1",
            "dst_ip": "10.0.0.2",
            "packet_count": 10,
            "bytes_sent": 500,
            "bytes_received": 1000,
            "syn_count": 1,
            "rst_count": 0,
            "duration": 2.5
        }
        agg.add_flow_sample(f_dict)
        metrics = agg.get_window_metrics("10s")
        self.assertEqual(metrics["flow_count"], 1)
        self.assertEqual(metrics["total_packets"], 10)
        self.assertEqual(metrics["total_bytes"], 1500)

if __name__ == "__main__":
    unittest.main()
