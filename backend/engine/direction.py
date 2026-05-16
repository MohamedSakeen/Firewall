LOCAL_NETWORK = "192.168."

def get_direction(packet):
    src_ip = packet["src_ip"]
    if src_ip.startswith(LOCAL_NETWORK):
        return "OUTBOUND"
    return "INBOUND"