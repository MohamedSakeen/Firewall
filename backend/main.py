from scapy.all import sniff
from scapy.layers.inet import IP, TCP

from firewall.engine import check_packet
from IDS.detector import detect_port_scan

def process_packet(packet):

    if IP in packet and TCP in packet:

        src_ip = packet[IP].src
        dst_port = packet[TCP].dport
        dst_ip = packet[IP].dst

        firewall_result = check_packet(src_ip, dst_port)
        port_scan_result = detect_port_scan(src_ip, dst_port)

        print(f"{src_ip}:{dst_ip}:{dst_port} -> {firewall_result} (Port Scan: {port_scan_result})")
        if port_scan_result:
            print(f"[ALERT] port Scan Detected from {src_ip} on port {dst_port}")

sniff(prn=process_packet, store=False)