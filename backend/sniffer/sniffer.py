from scapy.all import *
from scapy.layers.inet import IP, TCP, UDP
import json
from datetime import datetime

def process_packet(packet):
    if IP in packet:
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst
        protocol= packet[IP].proto

        print(f"\nSource: {src_ip}")
        print(f"Destination: {dst_ip}")
        print(f"Protocol: {protocol}")

        if TCP in packet:
            print(f"TCP port: {packet[TCP].dport}")

        elif UDP in packet:
            print(f"UDP port: {packet[UDP].dport}")
            print(f"UDP source port: {packet[UDP].sport}")

        log_data = {
            "time" : str(datetime.now()),
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "protocol": protocol
        }

        with open(r"P:\Firewall\backend\logs\traffic.json", "a") as f:
            f.write(json.dumps(log_data) + "\n")

sniff(prn=process_packet,store=False)