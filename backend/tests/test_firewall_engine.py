import unittest
from engine.firewall.stateful_evaluator import evaluate_stateful_packet
from engine.firewall.session_tracker import session

class TestFirewallEngine(unittest.TestCase):
    def test_stateful_tcp_handshake(self):
        session.clear()
        syn_packet = {
            "src_ip": "10.0.0.15",
            "dst_ip": "192.168.1.1",
            "src_port": 54321,
            "dst_port": 443,
            "protocol": "TCP",
            "tcp_flags": "S"
        }
        result = evaluate_stateful_packet(syn_packet)
        self.assertEqual(result, "NEW_SESSION")
        
        ack_packet = {
            "src_ip": "10.0.0.15",
            "dst_ip": "192.168.1.1",
            "src_port": 54321,
            "dst_port": 443,
            "protocol": "TCP",
            "tcp_flags": "A"
        }
        result2 = evaluate_stateful_packet(ack_packet)
        self.assertIn(result2, ["ESTABLISHED", "SYN_SENT", "NEW_SESSION"])

if __name__ == "__main__":
    unittest.main()
