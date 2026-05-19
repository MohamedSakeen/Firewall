from time import time
from engine.firewall.session_tracker import session, SESSION_TIMEOUT, remove_session

def cleanup_sessions():
    current_time = time()
    expired_sessions = []
    for key, value in session.items():
        if current_time - value["last_seen"] > SESSION_TIMEOUT:
            expired_sessions.append(key)
    
    for key in expired_sessions:
        remove_session(key)