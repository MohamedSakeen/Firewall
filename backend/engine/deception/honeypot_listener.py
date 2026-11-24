import time

class DecoyHoneypotListener:
    """
<<<<<<< HEAD
    Decoy Honeypot listener monitoring configured decoy ports.
    Connection attempts are recorded as honeypot signals without inventing confidence values.
    """
    def __init__(self, decoy_ports=None):
        self.decoy_ports = set(decoy_ports or [])
        self.honeypot_hits = []

    def add_decoy(self, port):
        self.decoy_ports.add(port)
        return port

    def configure_decoy_ports(self, ports):
        self.decoy_ports = set(ports or [])
        return sorted(self.decoy_ports)

=======
    Decoy Honeypot listener monitoring unallocated decoy ports (e.g. 2222, 8080, 33890).
    Any connection attempt triggers high-confidence honeypot signals (97% anomaly score).
    """
    def __init__(self, decoy_ports=None):
        self.decoy_ports = set(decoy_ports or [2222, 8080, 33890])
        self.honeypot_hits = []

>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
    def check_packet(self, packet):
        dst_port = packet.get("dst_port")
        if dst_port in self.decoy_ports:
            hit = {
                "hit_id": f"HP-{len(self.honeypot_hits) + 1}",
                "src_ip": packet.get("src_ip"),
                "dst_port": dst_port,
                "timestamp": time.time(),
<<<<<<< HEAD
                "confidence_score": None,
=======
                "confidence_score": 0.97,
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
                "signal": "honeypot_touch"
            }
            self.honeypot_hits.append(hit)
            return True, hit
<<<<<<< HEAD

=======
            
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        return False, None

global_honeypot_listener = DecoyHoneypotListener()
