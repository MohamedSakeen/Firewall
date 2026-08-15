class CounterfactualDefenseEngine:
    """
    Evaluates 'What-If' defensive options for an incident and recommends the optimal trade-off
    between threat mitigation and service availability impact.
    """
    def compare_defense_options(self, incident, asset_criticality="MEDIUM"):
        attacker_ip = incident.attacker_ip if hasattr(incident, "attacker_ip") else incident.get("attacker_ip")
        
        options = [
            {
                "option": "A: Block Attacker IP",
                "action": "BLOCK_IP",
                "security_impact": "HIGH (100% Attacker Isolated)",
                "availability_impact": "LOW (Only affects attacker IP)",
                "expected_false_blocks": 0,
                "recommendation_score": 95
            },
            {
                "option": "B: Rate-Limit Attacker IP",
                "action": "RATE_LIMIT",
                "security_impact": "MEDIUM (Slows down attack)",
                "availability_impact": "MINIMAL",
                "expected_false_blocks": 0,
                "recommendation_score": 75
            },
            {
                "option": "C: Block Target Port Network-Wide",
                "action": "BLOCK_PORT",
                "security_impact": "HIGH",
                "availability_impact": "HIGH (Disrupts legitimate users on port)",
                "expected_false_blocks": 15,
                "recommendation_score": 40
            },
            {
                "option": "D: Quarantine Target Host",
                "action": "QUARANTINE_HOST",
                "security_impact": "HIGH",
                "availability_impact": "CRITICAL (Target host offline)",
                "expected_false_blocks": 1,
                "recommendation_score": 50 if asset_criticality != "CRITICAL" else 20
            }
        ]

        # Sort by recommendation score descending
        options.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return {
            "incident_id": getattr(incident, "incident_id", "INC-000"),
            "best_recommendation": options[0]["option"],
            "options": options
        }

global_counterfactual_engine = CounterfactualDefenseEngine()
