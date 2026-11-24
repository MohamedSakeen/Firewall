from engine.IPS.response_controller import global_response_controller


def process_ips_action(src_ip, severity, **kwargs):
    """Compatibility wrapper: all enforcement decisions live in the controller."""
    return global_response_controller.process(src_ip, severity, **kwargs)
