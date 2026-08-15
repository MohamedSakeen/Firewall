class ThreatHuntingEngine:
    """
    Query & pivot engine for searching flow telemetry and alerts across attributes.
    """
    def execute_search(self, flow_records, src_ip=None, dst_ip=None, min_threat_score=0, protocol=None):
        results = []
        for f in flow_records:
            if src_ip and f.get("src_ip") != src_ip:
                continue
            if dst_ip and f.get("dst_ip") != dst_ip:
                continue
            if protocol and f.get("protocol") != protocol:
                continue
            if f.get("threat_score", 0) < min_threat_score:
                continue
            results.append(f)

        return {
            "query": {
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "min_threat_score": min_threat_score,
                "protocol": protocol
            },
            "total_matches": len(results),
            "results": results
        }

global_hunting_engine = ThreatHuntingEngine()
