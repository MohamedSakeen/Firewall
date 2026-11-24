import time

class DecoyHoneypotListener:
    """
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

    def check_packet(self, packet):
        dst_port = packet.get("dst_port")
        if dst_port in self.decoy_ports:
            hit = {
                "hit_id": f"HP-{len(self.honeypot_hits) + 1}",
                "src_ip": packet.get("src_ip"),
                "dst_port": dst_port,
                "timestamp": time.time(),
                "confidence_score": None,
                "signal": "honeypot_touch"
            }
            self.honeypot_hits.append(hit)
            return True, hit

        return False, None

global_honeypot_listener = DecoyHoneypotListener()
