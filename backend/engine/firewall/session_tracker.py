from collections import defaultdict 
from time import time

session = defaultdict(dict)

SESSION_TIMEOUT = 300  # 5 minutes

def create_session(session_key, state):
    session[session_key] = {
        "state": state,
        "last_seen": time()
    }

def update_session(session_key, state):
    if session_key in session:
        session[session_key]["state"] = state
        session[session_key]["last_seen"] = time()

def get_session_state(session_key):
    return session.get(session_key)

def remove_session(session_key):
    if session_key in session:
        del session[session_key]