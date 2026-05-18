from collections import defaultdict
from time import time
threat_tracker = defaultdict(list)

def add_threat_event(src_ip, attack_type,score):
    threat_tracker[src_ip].append({
        "timestamp": time(),
        "attack": attack_type,
        "score": score
    })

def get_threat_event(src_ip):
    return threat_tracker[src_ip]