def match_port_scan(unique_ports, rule):
    """
    Evaluates whether unique target port counts meet or exceed the rule threshold.
    """
    threshold = rule.get("threshold", 10)
    return unique_ports >= threshold

def match_syn_flood(syn_count, rule):
    """
    Evaluates whether SYN packet counts within window meet or exceed flood threshold.
    """
    threshold = rule.get("threshold", 100)
    return syn_count >= threshold