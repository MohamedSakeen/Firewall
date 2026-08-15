class AttackGraphBuilder:
    """
    Constructs node/edge attack graphs from incident alerts and network topology.
    Nodes: attacker, target assets, services, stages.
    Edges: scanned, attacked, compromised.
    """
    def build_graph_for_incident(self, incident):
        nodes = []
        edges = []

        attacker_id = f"node-attacker-{incident.attacker_ip}"
        nodes.append({
            "id": attacker_id,
            "label": f"Attacker ({incident.attacker_ip})",
            "type": "ATTACKER"
        })

        stage_id = f"node-stage-{incident.current_stage.lower().replace(' ', '-')}"
        nodes.append({
            "id": stage_id,
            "label": f"Stage: {incident.current_stage}",
            "type": "STAGE"
        })

        edges.append({
            "source": attacker_id,
            "target": stage_id,
            "label": "IN_STAGE"
        })

        for asset in incident.target_assets:
            asset_id = f"node-asset-{asset}"
            nodes.append({
                "id": asset_id,
                "label": f"Asset ({asset})",
                "type": "ASSET"
            })
            edges.append({
                "source": attacker_id,
                "target": asset_id,
                "label": "TARGETS"
            })

        return {
            "incident_id": incident.incident_id,
            "nodes": nodes,
            "edges": edges
        }

global_graph_builder = AttackGraphBuilder()
