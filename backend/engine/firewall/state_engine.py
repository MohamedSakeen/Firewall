SYN_FLAG = 0x02
ACK_FLAG = 0x10
FIN_FLAG = 0x01
RST_FLAG = 0x04

def determine_state(tcp_flags):
    # Handle int, str, or Scapy Flag objects
    flags_str = str(tcp_flags).upper() if tcp_flags is not None else ""
    
    if isinstance(tcp_flags, int):
        if tcp_flags & SYN_FLAG:
            return "SYN_SENT"
        elif tcp_flags & ACK_FLAG:
            return "ESTABLISHED"
        elif tcp_flags & FIN_FLAG:
            return "FIN_WAIT"
        elif tcp_flags & RST_FLAG:
            return "CLOSED"
    
    if "S" in flags_str:
        return "SYN_SENT"
    elif "A" in flags_str:
        return "ESTABLISHED"
    elif "F" in flags_str:
        return "FIN_WAIT"
    elif "R" in flags_str:
        return "CLOSED"

    return "UNKNOWN"