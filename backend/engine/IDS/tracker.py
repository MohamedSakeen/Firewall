from collections import defaultdict
from time import time

tracker = defaultdict(list)


def add_events(key, metadata, timestamp=None):
    tracker[key].append({
        "timestamp": time() if timestamp is None else timestamp,
        "data": metadata,
    })


def get_events(key):
    return tracker[key]


def clear_events(key=None):
    """Forget observations for one key, or for all keys when key is None."""
    if key is None:
        tracker.clear()
    else:
        tracker.pop(key, None)
