SYN_FLAG = 0x02
ACK_FLAG = 0x10
FIN_FLAG = 0x01

def determine_state(
    tcp_flags
):

    if tcp_flags == SYN_FLAG:
        return "SYN_SENT"

    elif tcp_flags == ACK_FLAG:
        return "ESTABLISHED"

    elif tcp_flags == FIN_FLAG:
        return "FIN_WAIT"

    return "UNKNOWN"