class PolicySimulator:
    """
    Simulates proposed firewall rules against historical flow datasets to measure
    false-block rates and evaluate safety before active enforcement.
    """
    def simulate_rule(self, proposed_rule, flow_history):
        """
        proposed_rule: {"ip": "10.0.0.23", "port": 445, "action": "BLOCK"}
        flow_history: list of flow dicts with "is_malicious" boolean flag
        """
        total_flows = len(flow_history)
        if total_flows == 0:
            return {
                "flows_analyzed": 0,
                "would_block": 0,
                "known_malicious": 0,
                "known_legitimate": 0,
                "estimated_false_positive_rate": 0.0,
                "recommendation": "SAFE"
            }

        target_ip = proposed_rule.get("ip")
        target_port = proposed_rule.get("port")

        would_block = 0
        known_malicious = 0
        known_legitimate = 0

        for f in flow_history:
            matches_ip = not target_ip or f.get("src_ip") == target_ip or f.get("dst_ip") == target_ip
            matches_port = not target_port or f.get("src_port") == target_port or f.get("dst_port") == target_port
            
            if matches_ip and matches_port:
                would_block += 1
                if f.get("is_malicious", False):
                    known_malicious += 1
                else:
                    known_legitimate += 1

        false_block_rate = round((known_legitimate / max(1, would_block)) * 100, 2)
        if false_block_rate < 1.0:
            recommendation = "SAFE"
        elif false_block_rate < 5.0:
            recommendation = "CAUTION"
        else:
            recommendation = "HIGH_RISK"

        return {
            "flows_analyzed": total_flows,
            "matched_flows": would_block,
            "malicious_matches": known_malicious,
            "legitimate_matches": known_legitimate,
            "estimated_false_positive_rate": false_block_rate,
            "recommendation": recommendation
        }

global_policy_simulator = PolicySimulator()
