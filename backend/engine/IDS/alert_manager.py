from datetime import datetime
import json

def create_alert(attack_type,severity, src_ip,score):
    alert = {
        "timestamp": str(datetime.now()),
        "attack": attack_type,
        "severity": severity,
        "src_ip": src_ip,
        "score": score
    }
    with open('alerts.json', 'a') as f:
        f.write(json.dumps(alert) + '\n')

    print(f"[ALERT] \n{attack_type} \nfrom {src_ip}")


    return alert

