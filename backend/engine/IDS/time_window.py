from time import time


def filter_recent_events(events, seconds, now=None):
    """Return events in the trailing window; ``now`` makes tests deterministic."""
    curr_time = time() if now is None else now
    return [
        event
        for event in events
        if 0 <= (curr_time - event["timestamp"]) <= seconds
    ]
