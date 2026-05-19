def generate_session_key(packet):
    return (
        f"{packet['src_ip']}:{packet['src_port']}->{packet['dst_ip']}:{packet['dst_port']}|{packet['protocol']}"
    )