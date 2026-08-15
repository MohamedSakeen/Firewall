import time
import datetime

# Standard port to service mapping
PORT_SERVICE_MAP = {
    80: "HTTP",
    443: "HTTPS",
    22: "SSH",
    21: "FTP",
    25: "SMTP",
    53: "DNS",
    3306: "MySQL",
    5432: "PostgreSQL",
    3389: "RDP",
    445: "SMB"
}

class ContextBuilder:
    """
    Builds contextual metadata for network transactions based on time, asset roles, and services.
    """
    def __init__(self, asset_roles=None):
        self.asset_roles = asset_roles or {
            "10.0.0.10": "Web Server",
            "10.0.0.20": "Database",
            "10.0.0.30": "Domain Controller"
        }

    def get_service_name(self, port):
        return PORT_SERVICE_MAP.get(port, f"PORT_{port}")

    def get_asset_role(self, ip):
        return self.asset_roles.get(ip, "Workstation")

    def build_context(self, src_ip, dst_ip, dst_port):
        now = datetime.datetime.now()
        hour = now.hour
        is_off_hours = hour < 6 or hour > 20
        day_of_week = now.strftime("%A")
        
        return {
            "src_asset_role": self.get_asset_role(src_ip),
            "dst_asset_role": self.get_asset_role(dst_ip),
            "service": self.get_service_name(dst_port),
            "hour": hour,
            "day_of_week": day_of_week,
            "is_off_hours": is_off_hours
        }

global_context_builder = ContextBuilder()
