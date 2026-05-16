def match_port_scan(unique_ports, rule):
    return(unique_ports >= rule["threshold"])