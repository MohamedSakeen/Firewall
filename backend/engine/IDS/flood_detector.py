from scapy.layers.inet import IP, TCP

from engine.IDS.tracker import add_events, get_events
from engine.IDS.time_window import filter_recent_events

def detect_syn_flood(packet, raw_packet,rule): 
    if not raw_packet.haslayer(TCP):
        return False
    flags = raw_packet[TCP].flags
    SYN_FLAG = 0x02
    if flags != SYN_FLAG:
        return False
    src_ip = packet["src_ip"]
    add_events(f"{src_ip}_syn", {
        "syn": True
    })
    events = get_events(f"{src_ip}_syn")
    recent_events = filter_recent_events(events, rule["time_window"])
    return(
        len(recent_events) >= rule["threshold"]
    )