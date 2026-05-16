from time import time
def filter_recent_events(events, seconds):
    curr_time = time()

    return[
        event 
        for event in events if (curr_time-event["timestamp"]) <= seconds
        
    ]