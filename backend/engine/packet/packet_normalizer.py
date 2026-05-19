from scapy.layers.inet import TCP,UDP,IP

def normalize_packet(packet):
    normalized = {
        "src_ip" : None,
        "dst_ip" : None,
        "protocol" : None,
        "src_port" : None,
        "dst_port" : None,
        "tcp_flags" : None
    }
    if IP in packet:
        normalized["src_ip"] = packet[IP].src
        normalized["dst_ip"] = packet[IP].dst
        if TCP in packet:
            normalized["protocol"] = "TCP"
            normalized["src_port"] = packet[TCP].sport
            normalized["dst_port"] = packet[TCP].dport
            normalized["tcp_flags"] = packet[TCP].flags
        elif UDP in packet:
            normalized["protocol"] = "UDP"
            normalized["src_port"] = packet[UDP].sport
            normalized["dst_port"] = packet[UDP].dport
    return normalized