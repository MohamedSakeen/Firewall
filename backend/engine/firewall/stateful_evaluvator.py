from engine.firewall.connection_table import (generate_session_key)
from engine.firewall.session_tracker import (create_session,update_session,get_session_state)
from engine.firewall.state_engine import (determine_state)

def evaluate_stateful_packet(
    packet
):

    if packet["protocol"] != "TCP":

        return "ALLOW"

    session_key = generate_session_key(
        packet
    )

    session = get_session_state(
        session_key
    )

    state = determine_state(
        packet["tcp_flags"]
    )

    if not session:

        create_session(
            session_key,
            state
        )

        return "NEW_SESSION"

    update_session(
        session_key,
        state
    )

    return session["state"]