def evaluate_packet(packet, rules):
    for rule in rules:
        protocol_match = (
            rule["protocol"] == "ANY"
            or 
            rule["protocol"] == packet["protocol"]
        )

        port_match = (
            rule["port"] == "ANY"
            or
            rule["port"] == packet["dst_port"]
        )

        ip_match = (
            "src_ip" not in rule
            or
            rule["src_ip"] == packet["src_ip"]
        )

        if protocol_match and port_match and ip_match:  
            return{
                "action": rule["action"],
                "rule": rule
            }
    return {
        "action": "deny",
        "rule": None
        }