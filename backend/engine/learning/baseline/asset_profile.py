import time

class AssetProfile:
    """
    Maintains per-asset behavioral identity, normal service profile, peer whitelist, and confidence.
    """
    def __init__(self, ip, role="Workstation", criticality="MEDIUM"):
        self.ip = ip
        self.role = role
        self.criticality = criticality  # LOW, MEDIUM, HIGH, CRITICAL
        
        self.normal_services = set()    # Set of destination ports normally accessed
        self.normal_peers = set()       # Set of IP peers normally communicated with
        self.normal_protocols = set()   # TCP, UDP, ICMP
        
        self.sample_count = 0
        self.first_seen = time.time()
        self.last_updated = time.time()
        self.stability_score = 1.0       # 0.0 to 1.0

    @property
    def confidence(self):
        """
        Calculates baseline confidence based on observation sample volume.
        Requires >= 50 observations for high confidence.
        """
        if self.sample_count <= 0:
            return 0.0
        return min(1.0, round(self.sample_count / 50.0, 2))

    def observe(self, peer_ip, dst_port, protocol):
        self.sample_count += 1
        self.last_updated = time.time()
        if dst_port:
            self.normal_services.add(dst_port)
        if peer_ip:
            self.normal_peers.add(peer_ip)
        if protocol:
            self.normal_protocols.add(protocol)

    def is_service_normal(self, port):
        if self.confidence < 0.2:
            return True  # Low confidence baseline does not flag
        return port in self.normal_services

    def is_peer_normal(self, peer_ip):
        if self.confidence < 0.2:
            return True
        return peer_ip in self.normal_peers

    def to_dict(self):
        return {
            "ip": self.ip,
            "role": self.role,
            "criticality": self.criticality,
            "normal_services": list(self.normal_services),
            "normal_peers_count": len(self.normal_peers),
            "sample_count": self.sample_count,
            "confidence": self.confidence,
            "first_seen": self.first_seen,
            "last_updated": self.last_updated
        }
