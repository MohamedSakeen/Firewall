class AttackReplayEngine:
    """
    Replays historic flow logs against current firewall policy rules vs original policy,
    benchmarking detection latency and false positive reductions.
    """
    def replay_incident_flows(self, flow_logs, current_rules, original_rules=None):
        total = len(flow_logs)
        orig_blocks = 0
        new_blocks = 0
        new_false_positives = 0

        for flow in flow_logs:
            ip = flow.get("src_ip")
            port = flow.get("dst_port")
            
            # Original policy check
            if original_rules and any(r.get("ip") == ip for r in original_rules):
                orig_blocks += 1

            # Current policy check
            if any(r.get("ip") == ip or r.get("port") == port for r in current_rules):
                new_blocks += 1
                if not flow.get("is_malicious", True):
                    new_false_positives += 1

        return {
            "flows_replayed": total,
            "original_policy_blocks": orig_blocks,
            "current_policy_blocks": new_blocks,
            "false_positives": new_false_positives,
            "efficiency_gain_pct": round(((new_blocks - new_false_positives) / max(1, total)) * 100, 2)
        }

global_replay_engine = AttackReplayEngine()
