from datetime import datetime
import json

from engine.scoring.threat_tracker import (
    add_threat_event,
    get_threat_event
)

from engine.scoring.score_engine import (
    calculate_threat_score
)

from engine.scoring.severity_engine import (
    determine_severity
)

from engine.scoring.correlation_engine import (
    correlate_events
)

from engine.IPS.ips_pipeline import (
    process_ips_action
)


def create_alert(attack_type,severity, src_ip,score):
    alert = {
        "timestamp": str(datetime.now()),
        "attack": attack_type,
        "severity": severity,
        "src_ip": src_ip,
        "score": score
    }
    with open('logs/alerts.json', 'a') as f:
        f.write(json.dumps(alert) + '\n')

    print(f"[ALERT] \n{attack_type} \nfrom {src_ip}")



    add_threat_event(src_ip, attack_type, score)
    events = get_threat_event(src_ip)
    total_score = calculate_threat_score(events)
    severity = determine_severity(total_score)
    process_ips_action(src_ip,severity)
    correlated_attacks = correlate_events(events)

    print(f"[SEVERITY]"
        f"{severity.upper()}")

    if correlated_attacks:
        print("[CORRELATED ATTACK]")
        for attack in correlated_attacks:
            print(attack["name"])
    return alert