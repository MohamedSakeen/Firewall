from engine.IPS.whitelist_engine import is_whitelisted
from engine.IPS.response_policy import get_response_policy
from engine.IPS.block_manager import block_ip
from engine.IPS.quarantine_engine import quarantine_ip

def process_ips_action(src_ip, severity):
    if is_whitelisted(src_ip):
        print(f"[WHITELISTED] {src_ip}")
        return 
    
    policy = get_response_policy(severity)

    action = policy["action"]
    if action == "block":
        block_ip(src_ip)
    elif action == "quarantine":
        quarantine_ip(
            src_ip, 
            policy["duration"], 
            severity
        )