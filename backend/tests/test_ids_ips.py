import unittest
from engine.IDS.detector import detect_port_scan
from engine.IPS.escalate_engine import register_offense, calculate_ban_duration

class TestIDSIPS(unittest.TestCase):
    def test_port_scan_detector(self):
        ip = "172.16.0.99"
        res = False
        for port in range(1000, 1015):
            res = detect_port_scan(ip, port)
        self.assertIsInstance(res, bool)

    def test_escalate_engine(self):
        ip = "192.168.1.200"
        offenses = register_offense(ip)
        self.assertGreaterEqual(offenses, 1)
        duration = calculate_ban_duration(offenses)
        self.assertGreaterEqual(duration, 300)

if __name__ == "__main__":
    unittest.main()
