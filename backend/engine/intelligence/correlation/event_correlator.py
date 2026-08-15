import time
import threading
from engine.intelligence.incidents.incident_engine import Incident

class EventCorrelator:
    """
    Correlates individual security alerts into active Incident objects
    using attacker source IP and temporal proximity (window = 300s).
    """
    def __init__(self, time_window=300):
        self.time_window = time_window
        self.active_incidents = {}  # attacker_ip -> Incident
        self.incident_counter = 1000
        self._lock = threading.Lock()

    def process_alert(self, alert_dict):
        attacker_ip = alert_dict.get("src_ip", "0.0.0.0")
        now = time.time()

        with self._lock:
            if attacker_ip in self.active_incidents:
                incident = self.active_incidents[attacker_ip]
                # Check if window expired
                if now - incident.updated_at > self.time_window:
                    incident.status = "CLOSED"
                    # Create new incident
                    self.incident_counter += 1
                    incident = Incident(f"INC-{self.incident_counter}", attacker_ip)
                    self.active_incidents[attacker_ip] = incident
            else:
                self.incident_counter += 1
                incident = Incident(f"INC-{self.incident_counter}", attacker_ip)
                self.active_incidents[attacker_ip] = incident

            incident.add_alert(alert_dict)
            return incident

    def get_all_incidents(self):
        with self._lock:
            return [inc.to_dict() for inc in self.active_incidents.values()]

global_event_correlator = EventCorrelator()
