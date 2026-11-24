class CounterfactualDefenseEngine:
    """
    Evaluates 'What-If' defensive options for an incident and recommends the optimal trade-off
    between threat mitigation and service availability impact.
    """
    def _incident_field(self, incident, name, default=None):
        if isinstance(incident, dict):
            return incident.get(name, default)
        return getattr(incident, name, default)

    def compare_defense_options(self, incident, asset_criticality="MEDIUM", flow_history=None):
        from engine.response.simulator.policy_simulator import global_policy_simulator

        attacker_ip = self._incident_field(incident, "attacker_ip")
        target_ip = self._incident_field(incident, "target_ip") or self._incident_field(incident, "destination_ip")
        target_port = self._incident_field(incident, "target_port") or self._incident_field(incident, "destination_port")

        option_specs = [
            {
                "option": "A: Block Attacker IP",
                "action": "BLOCK_IP",
                "security_impact": "HIGH (100% Attacker Isolated)",
                "availability_impact": "LOW (Only affects attacker IP)",
                "rule": {"ip": attacker_ip, "action": "BLOCK"},
            },
            {
                "option": "B: Rate-Limit Attacker IP",
                "action": "RATE_LIMIT",
                "security_impact": "MEDIUM (Slows down attack)",
                "availability_impact": "MINIMAL",
                "rule": {"ip": attacker_ip, "action": "RATE_LIMIT"},
            },
            {
                "option": "C: Block Target Port Network-Wide",
                "action": "BLOCK_PORT",
                "security_impact": "HIGH",
                "availability_impact": "HIGH (Disrupts legitimate users on port)",
                "rule": {"port": target_port, "action": "BLOCK"},
            },
            {
                "option": "D: Quarantine Target Host",
                "action": "QUARANTINE_HOST",
                "security_impact": "HIGH",
                "availability_impact": "CRITICAL (Target host offline)",
                "rule": {"ip": target_ip, "action": "QUARANTINE"},
            },
        ]

        options = []
        for spec in option_specs:
            option = {key: value for key, value in spec.items() if key != "rule"}
            simulation = None
            rule = spec["rule"]
            if flow_history and (rule.get("ip") is not None or rule.get("port") is not None):
                simulation = global_policy_simulator.simulate_rule(rule, flow_history)

            if simulation:
                matched_flows = simulation.get("matched_flows", 0)
                false_blocks = simulation.get("legitimate_matches", 0)
                true_blocks = simulation.get("malicious_matches", 0)
                score = (100.0 * (true_blocks - false_blocks) / matched_flows) if matched_flows else 0.0
                if option["action"] == "QUARANTINE_HOST" and asset_criticality == "CRITICAL":
                    score *= 0.5
                score = round(max(0.0, min(100.0, score)), 1)
                option["simulation_recommendation"] = simulation.get("recommendation")
                option["estimated_false_positive_rate"] = simulation.get("estimated_false_positive_rate")
            else:
                matched_flows = None
                false_blocks = None
                true_blocks = None
                score = None

            option["matched_flows"] = matched_flows
            option["expected_false_blocks"] = false_blocks
            option["true_blocks"] = true_blocks
            option["recommendation_score"] = score
            options.append(option)

        options.sort(key=lambda item: item["recommendation_score"] if item["recommendation_score"] is not None else -1, reverse=True)
        best_recommendation = options[0]["option"] if options and options[0]["recommendation_score"] is not None else None
        return {
            "incident_id": self._incident_field(incident, "incident_id"),
            "best_recommendation": best_recommendation,
            "options": options
        }

global_counterfactual_engine = CounterfactualDefenseEngine()
