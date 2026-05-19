import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from scapy.all import sniff
from scapy.layers.inet import IP, TCP

from engine.firewall.engine import check_packet
from engine.IDS.detector import detect_port_scan
from engine.IDS.detection_pipeline import run_detection_pipeline
from backend.engine.packet.packet_normalizer import normalize_packet 
from backend.engine.firewall.stateful_evaluvator import evaluate_stateful_packet

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

        normalized_packet = normalize_packet(packet)
        state_result = evaluate_stateful_packet(normalized_packet)
        print(
            f"[STATEFUL] "
            f"{state_result}"
        )
        run_detection_pipeline(normalized_packet,packet)

sniff(prn=process_packet, store=False)