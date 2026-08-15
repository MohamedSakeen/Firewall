import time

class DecoyHoneypotListener:
    """
    Decoy Honeypot listener monitoring unallocated decoy ports (e.g. 2222, 8080, 33890).
    Any connection attempt triggers high-confidence honeypot signals (97% anomaly score).
    """
    def __init__(self, decoy_ports=None):
        self.decoy_ports = set(decoy_ports or [2222, 8080, 33890])
        self.honeypot_hits = []

    def check_packet(self, packet):
        dst_port = packet.get("dst_port")
        if dst_port in self.decoy_ports:
            hit = {
                "hit_id": f"HP-{len(self.honeypot_hits) + 1}",
                "src_ip": packet.get("src_ip"),
                "dst_port": dst_port,
                "timestamp": time.time(),
                "confidence_score": 0.97,
                "signal": "honeypot_touch"
            }
            self.honeypot_hits.append(hit)
            return True, hit
            
        return False, None

global_honeypot_listener = DecoyHoneypotListener()
