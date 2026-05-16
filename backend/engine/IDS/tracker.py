from collections import defaultdict
from time import time

tracker = defaultdict(list)

def add_events(key,metadata):
    tracker[key].append({
        "timestamp": time(),
        "data": metadata
    })

def get_events(key):
    return tracker[key]