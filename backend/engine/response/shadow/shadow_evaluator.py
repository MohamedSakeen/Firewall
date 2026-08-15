import time

class ShadowRuleEvaluator:
    """
    Evaluates candidate firewall policies in SHADOW mode (non-blocking observation),
    tracking match statistics and false-positive hits prior to ACTIVE promotion.
    """
    def __init__(self):
        self.shadow_rules = {}  # rule_id -> rule_dict

    def add_shadow_rule(self, rule_id, target_ip, target_port=None, action="BLOCK"):
        self.shadow_rules[rule_id] = {
            "rule_id": rule_id,
            "target_ip": target_ip,
            "target_port": target_port,
            "action": action,
            "mode": "SHADOW",
            "matches": 0,
            "legitimate_matches": 0,
            "created_at": time.time()
        }

    def evaluate_packet(self, packet, is_legitimate=True):
        matches = []
        for r_id, rule in self.shadow_rules.items():
            if rule["mode"] != "SHADOW":
                continue
            ip_match = packet.get("src_ip") == rule["target_ip"] or packet.get("dst_ip") == rule["target_ip"]
            port_match = not rule["target_port"] or packet.get("src_port") == rule["target_port"] or packet.get("dst_port") == rule["target_port"]
            
            if ip_match and port_match:
                rule["matches"] += 1
                if is_legitimate:
                    rule["legitimate_matches"] += 1
                matches.append(rule)

        return matches

    def promote_to_active(self, rule_id):
        if rule_id in self.shadow_rules:
            self.shadow_rules[rule_id]["mode"] = "ACTIVE"
            return True
        return False

global_shadow_evaluator = ShadowRuleEvaluator()
