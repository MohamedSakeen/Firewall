import json
from pathlib import Path

class SecurityReplayLab:
    """
    Safe simulation and PCAP replay lab for executing test scenario suites
    (normal_web, port_scan, network_sweep, ssh_bruteforce, dns_anomaly, lateral_movement, failed_response)
    to benchmark system detection, learning, and response effectiveness.
    """
    SCENARIOS = [
        "normal_web", "port_scan", "network_sweep", "ssh_bruteforce",
        "dns_anomaly", "lateral_movement", "failed_response"
    ]
    RULES_PATH = Path(__file__).resolve().parents[1] / "rules" / "firewall" / "rules.json"

    def _load_current_rules(self):
        try:
            with self.RULES_PATH.open(encoding="utf-8") as handle:
                data = json.load(handle)
        except (OSError, ValueError):
            return []

        rules = []
        if isinstance(data, dict):
            for ip in data.get("blocked_ips") or []:
                rules.append({"ip": ip})
            for port in data.get("blocked_ports") or []:
                rules.append({"port": port})
        elif isinstance(data, list):
            rules.extend(item for item in data if isinstance(item, dict))
        return rules

    def run_scenario(self, scenario_name, flow_logs=None, current_rules=None, original_rules=None):
        if not flow_logs:
            return {
                "scenario": scenario_name,
                "status": "NOT_RUN",
                "reason": "No replay dataset provided",
                "packets_replayed": 0,
                "actual_detections": 0
            }

        from engine.forensics.replay_engine import global_replay_engine

        rules = current_rules if current_rules is not None else self._load_current_rules()
        result = global_replay_engine.replay_incident_flows(flow_logs, rules, original_rules)
        return {
            "scenario": scenario_name,
            "status": "COMPLETED",
            "packets_replayed": result["flows_replayed"],
            "actual_detections": result["current_policy_blocks"],
            "original_policy_blocks": result["original_policy_blocks"],
            "false_positives": result["false_positives"],
            "efficiency_gain_pct": result["efficiency_gain_pct"],
            "benchmark_passed": result["false_positives"] == 0
        }

global_replay_lab = SecurityReplayLab()
