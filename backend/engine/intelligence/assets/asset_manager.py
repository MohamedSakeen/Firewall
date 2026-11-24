class AssetManager:
    """
    Central asset inventory tracking IP, hostname, role, criticality, network segment, and owner.
    """
    def __init__(self):
        self.assets = {}  # IP -> Asset dict

    def register_asset(self, ip, hostname="", role="Workstation", criticality="MEDIUM", segment="INTERNAL", owner="IT"):
        asset = {
            "ip": ip,
<<<<<<< HEAD
            "hostname": hostname or "",
=======
            "hostname": hostname or f"host-{ip.replace('.', '-')}",
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
            "role": role,
            "criticality": criticality,
            "segment": segment,
            "owner": owner
        }
        self.assets[ip] = asset
        return asset

    def get_asset(self, ip):
        if ip not in self.assets:
            # Default dynamic registration
            return self.register_asset(ip)
        return self.assets[ip]

    def list_all_assets(self):
        return list(self.assets.values())

global_asset_manager = AssetManager()
