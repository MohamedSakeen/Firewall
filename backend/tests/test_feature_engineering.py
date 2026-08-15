import unittest
from engine.features.feature_extractor import FeatureExtractor, calculate_shannon_entropy
from engine.features.context_builder import ContextBuilder

class TestFeatureEngineering(unittest.TestCase):
    def test_shannon_entropy(self):
        # Uniform distribution of 4 distinct items = log2(4) = 2.0
        entropy = calculate_shannon_entropy(["80", "443", "22", "53"])
        self.assertAlmostEqual(entropy, 2.0, places=2)
        
        # Single repeated item = 0 entropy
        single_entropy = calculate_shannon_entropy(["80", "80", "80"])
        self.assertEqual(single_entropy, 0.0)

    def test_feature_extractor(self):
        extractor = FeatureExtractor()
        flow = {
            "flow_id": "TCP:10.0.0.1:1234<->10.0.0.10:80",
            "src_ip": "10.0.0.1",
            "dst_ip": "10.0.0.10",
            "src_port": 1234,
            "dst_port": 80,
            "packet_count": 100,
            "duration": 5.0,
            "bytes_sent": 4000,
            "bytes_received": 16000,
            "syn_count": 1,
            "ack_count": 99,
            "rst_count": 0,
            "packet_size_mean": 200.0,
            "packet_size_std": 20.0
        }
        features = extractor.extract_from_flow(flow)
        self.assertEqual(features["packets_per_second"], 20.0)
        self.assertEqual(features["bytes_per_second"], 4000.0)
        self.assertEqual(features["service"], "HTTP")
        self.assertEqual(features["dst_asset_role"], "Web Server")

    def test_window_features(self):
        extractor = FeatureExtractor()
        flows = [
            {"dst_ip": "10.0.0.1", "dst_port": 80, "packet_count": 10, "bytes_sent": 100, "bytes_received": 100, "syn_count": 1, "rst_count": 0},
            {"dst_ip": "10.0.0.2", "dst_port": 443, "packet_count": 20, "bytes_sent": 200, "bytes_received": 200, "syn_count": 1, "rst_count": 0},
        ]
        wf = extractor.extract_from_flow_window(flows)
        self.assertEqual(wf["unique_destinations"], 2)
        self.assertEqual(wf["unique_ports"], 2)
        self.assertGreater(wf["destination_entropy"], 0.0)

if __name__ == "__main__":
    unittest.main()
