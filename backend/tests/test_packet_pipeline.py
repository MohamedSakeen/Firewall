import unittest
from scapy.layers.inet import IP, TCP, UDP
from engine.packet.packet_normalizer import normalize_packet

class TestPacketPipeline(unittest.TestCase):
    def test_normalize_tcp_packet(self):
        scapy_pkt = IP(src="192.168.1.50", dst="10.0.0.1") / TCP(sport=12345, dport=80, flags="S")
        normalized = normalize_packet(scapy_pkt)
        
        self.assertEqual(normalized["src_ip"], "192.168.1.50")
        self.assertEqual(normalized["dst_ip"], "10.0.0.1")
        self.assertEqual(normalized["src_port"], 12345)
        self.assertEqual(normalized["dst_port"], 80)
        self.assertEqual(normalized["protocol"], "TCP")
        self.assertEqual(normalized["tcp_flags"], "S")

    def test_normalize_udp_packet(self):
        scapy_pkt = IP(src="192.168.1.50", dst="10.0.0.1") / UDP(sport=5353, dport=53)
        normalized = normalize_packet(scapy_pkt)
        
        self.assertEqual(normalized["src_ip"], "192.168.1.50")
        self.assertEqual(normalized["dst_ip"], "10.0.0.1")
        self.assertEqual(normalized["src_port"], 5353)
        self.assertEqual(normalized["dst_port"], 53)
        self.assertEqual(normalized["protocol"], "UDP")

if __name__ == "__main__":
    unittest.main()
