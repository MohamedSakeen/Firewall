import json
with open(r"P:\Firewall\backend\firewall\rules.json", "r") as f:
    rules = json.load(f)

blocked_ips = rules["blocked_ips"]
blocked_port = rules["blocked_ports"]

def check_packet(src_ip, dst_port):
    if src_ip in blocked_ips:
        return "Blocked IP Address"
    if dst_port in blocked_port:
        return "Blocked Port"
    return "ALLOWED"