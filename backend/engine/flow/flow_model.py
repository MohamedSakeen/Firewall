import time
import math

class Flow:
    """
    Represents a 5-tuple bidirectional network flow object with statistical telemetry.
    """
    def __init__(self, src_ip, dst_ip, src_port, dst_port, protocol):
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.src_port = src_port
        self.dst_port = dst_port
        self.protocol = protocol
        
        # Unique bidirectional key (canonical tuple)
        self.flow_id = Flow.generate_flow_id(src_ip, dst_ip, src_port, dst_port, protocol)
        
        now = time.time()
        self.start_time = now
        self.end_time = now
        self.last_packet_time = now
        self.duration = 0.0
        
        self.packet_count = 0
        self.bytes_sent = 0       # src -> dst
        self.bytes_received = 0   # dst -> src
        
        # TCP Flags breakdown
        self.syn_count = 0
        self.syn_ack_count = 0
        self.ack_count = 0
        self.rst_count = 0
        self.fin_count = 0
        
        # Size statistics
        self.packet_sizes = []
        self.inter_arrival_times = []
        
        # Lifecycle state: NEW -> ACTIVE -> IDLE -> CLOSED
        self.state = "NEW"
        
    @staticmethod
    def generate_flow_id(src_ip, dst_ip, src_port, dst_port, protocol):
        """Generates a canonical bidirectional flow ID."""
        ep1 = (src_ip, src_port if src_port is not None else 0)
        ep2 = (dst_ip, dst_port if dst_port is not None else 0)
        if ep1 > ep2:
            ep1, ep2 = ep2, ep1
        return f"{protocol}:{ep1[0]}:{ep1[1]}<->{ep2[0]}:{ep2[1]}"

    def update_with_packet(self, packet):
        """Ingests normalized packet dict and updates flow statistics."""
        now = time.time()
        if self.packet_count > 0:
            iat = max(0.0, now - self.last_packet_time)
            self.inter_arrival_times.append(iat)
            if len(self.inter_arrival_times) > 100:
                self.inter_arrival_times.pop(0)

        self.last_packet_time = now
        self.end_time = now
        self.duration = self.end_time - self.start_time
        self.packet_count += 1
        
        pkt_size = packet.get("payload_size", 0) or packet.get("size", 64)
        self.packet_sizes.append(pkt_size)
        if len(self.packet_sizes) > 100:
            self.packet_sizes.pop(0)

        # Direction check
        if packet.get("src_ip") == self.src_ip:
            self.bytes_sent += pkt_size
        else:
            self.bytes_received += pkt_size

        # TCP Flag accounting
        flags = str(packet.get("tcp_flags", "")).upper()
        if "S" in flags and "A" in flags:
            self.syn_ack_count += 1
        elif "S" in flags:
            self.syn_count += 1
        if "A" in flags and "S" not in flags:
            self.ack_count += 1
        if "R" in flags:
            self.rst_count += 1
            self.state = "CLOSED"
        if "F" in flags:
            self.fin_count += 1
            self.state = "CLOSED"

        if self.state == "NEW" and self.packet_count > 1:
            self.state = "ACTIVE"

    @property
    def packet_size_mean(self):
        if not self.packet_sizes:
            return 0.0
        return sum(self.packet_sizes) / len(self.packet_sizes)

    @property
    def packet_size_std(self):
        if len(self.packet_sizes) < 2:
            return 0.0
        mean = self.packet_size_mean
        variance = sum((x - mean) ** 2 for x in self.packet_sizes) / len(self.packet_sizes)
        return math.sqrt(variance)

    @property
    def inter_arrival_mean(self):
        if not self.inter_arrival_times:
            return 0.0
        return sum(self.inter_arrival_times) / len(self.inter_arrival_times)

    @property
    def inter_arrival_std(self):
        if len(self.inter_arrival_times) < 2:
            return 0.0
        mean = self.inter_arrival_mean
        variance = sum((x - mean) ** 2 for x in self.inter_arrival_times) / len(self.inter_arrival_times)
        return math.sqrt(variance)

    def to_dict(self):
        return {
            "flow_id": self.flow_id,
            "src_ip": self.src_ip,
            "dst_ip": self.dst_ip,
            "src_port": self.src_port,
            "dst_port": self.dst_port,
            "protocol": self.protocol,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": round(self.duration, 4),
            "packet_count": self.packet_count,
            "bytes_sent": self.bytes_sent,
            "bytes_received": self.bytes_received,
            "syn_count": self.syn_count,
            "syn_ack_count": self.syn_ack_count,
            "ack_count": self.ack_count,
            "rst_count": self.rst_count,
            "fin_count": self.fin_count,
            "packet_size_mean": round(self.packet_size_mean, 2),
            "packet_size_std": round(self.packet_size_std, 2),
            "inter_arrival_mean": round(self.inter_arrival_mean, 4),
            "inter_arrival_std": round(self.inter_arrival_std, 4),
            "state": self.state
        }
