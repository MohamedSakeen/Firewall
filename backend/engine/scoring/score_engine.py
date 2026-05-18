from time import time

TIME_WINDOW = 300

def calculate_threat_score(events):
    curr_time = time()

    recent_events = [
        event for event in events if ( curr_time-event["timestamp"]) <= TIME_WINDOW
    ]

    total_score = sum(event["score"] for event in recent_events)

    return total_score
