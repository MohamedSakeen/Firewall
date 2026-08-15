import time

class AssetRelationshipEngine:
    """
    Tracks evidence-backed relationships between network assets and entities
    (communicates_with, scanned, attacked, served_by, authenticated_to, blocked_by, triggered, contained_by).
    """
    VALID_RELATIONSHIPS = {
        "communicates_with", "scanned", "attacked", "served_by",
        "resolved_by", "authenticated_to", "blocked_by", "triggered", "contained_by"
    }

    def __init__(self):
        self.relationships = []  # list of relationship dicts

    def add_relationship(self, source, target, relationship_type, confidence=0.9, evidence=None):
        if relationship_type not in self.VALID_RELATIONSHIPS:
            relationship_type = "communicates_with"

        evidence_list = evidence if isinstance(evidence, list) else ([str(evidence)] if evidence else [])
        now = time.time()

        # Check if existing relationship between source and target exists
        for rel in self.relationships:
            if rel["source"] == source and rel["target"] == target and rel["relationship_type"] == relationship_type:
                rel["last_seen"] = now
                rel["confidence"] = max(rel["confidence"], confidence)
                for ev in evidence_list:
                    if ev not in rel["evidence"]:
                        rel["evidence"].append(ev)
                return rel

        rel_obj = {
            "source": source,
            "target": target,
            "relationship_type": relationship_type,
            "first_seen": now,
            "last_seen": now,
            "confidence": float(confidence),
            "evidence": evidence_list
        }
        self.relationships.append(rel_obj)
        return rel_obj

    def get_relationships_for_asset(self, asset_ip):
        return [
            rel for rel in self.relationships
            if rel["source"] == asset_ip or rel["target"] == asset_ip
        ]

    def list_all_relationships(self):
        return self.relationships

global_asset_relationship_engine = AssetRelationshipEngine()
