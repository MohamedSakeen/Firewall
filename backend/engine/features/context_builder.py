<<<<<<< HEAD
import datetime

=======
import time
import datetime

# Standard port to service mapping
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
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
<<<<<<< HEAD
        self.asset_roles = asset_roles or {}
=======
        self.asset_roles = asset_roles or {
            "10.0.0.10": "Web Server",
            "10.0.0.20": "Database",
            "10.0.0.30": "Domain Controller"
        }
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

    def get_service_name(self, port):
        return PORT_SERVICE_MAP.get(port, f"PORT_{port}")

    def get_asset_role(self, ip):
<<<<<<< HEAD
        if ip in self.asset_roles:
            return self.asset_roles[ip]

        from engine.intelligence.assets.asset_manager import global_asset_manager
        if ip not in getattr(global_asset_manager, "assets", {}):
            return "UNKNOWN"
        asset = global_asset_manager.get_asset(ip)
        if not asset:
            return "UNKNOWN"
        return asset.get("role") or "UNKNOWN"
=======
        return self.asset_roles.get(ip, "Workstation")
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

    def build_context(self, src_ip, dst_ip, dst_port):
        now = datetime.datetime.now()
        hour = now.hour
        is_off_hours = hour < 6 or hour > 20
        day_of_week = now.strftime("%A")
<<<<<<< HEAD

=======
        
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        return {
            "src_asset_role": self.get_asset_role(src_ip),
            "dst_asset_role": self.get_asset_role(dst_ip),
            "service": self.get_service_name(dst_port),
            "hour": hour,
            "day_of_week": day_of_week,
            "is_off_hours": is_off_hours
        }

global_context_builder = ContextBuilder()
