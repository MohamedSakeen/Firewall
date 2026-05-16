from engine.IDS.tracker import add_events, get_events
from engine.IDS.time_window import filter_recent_events

def detect_port_scan(packet, rule):
    src_ip = packet["src_ip"]
    add_events(src_ip,{"port": packet["dst_port"]})
    events = get_events(src_ip)
    recent_events = filter_recent_events(events, rule["time_window"])
    unique_ports = set(event["data"]["port"] for event in recent_events)

    return(len(unique_ports) >= rule["threshold"])
