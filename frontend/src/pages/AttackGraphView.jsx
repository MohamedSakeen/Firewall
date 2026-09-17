import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';

export default function AttackGraphView() {
  const [graphData, setGraphData] = useState(null);

  useEffect(() => { fetchGraph(); }, []);

  const fetchGraph = async () => {
    try { const res = await axios.get('http://localhost:5000/api/incidents/INC-1001/graph'); setGraphData(res.data); } catch (err) { console.error('Error fetching graph:', err); }
  };

  const nodeTypeStyle = (type) => {
    switch (type) {
      case 'ATTACKER': return { color: 'var(--status-threat)' };
      case 'STAGE': return { color: 'var(--status-warning)' };
      case 'ASSET': return { color: 'var(--accent)' };
      default: return { color: 'var(--text-secondary)' };
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Attack Graph</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Attacker pathways, targeted assets, kill-chain stages</div>
      </div>

      <div className="rounded p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Topology: {graphData?.incident_id || 'INC-1001'}
        </div>

        {/* Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {graphData?.nodes?.map((node) => (
            <div key={node.id} className="rounded p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{node.type}</span>
              </div>
              <div className="text-sm font-medium mt-1.5" style={nodeTypeStyle(node.type)}>{node.label}</div>
            </div>
          ))}
        </div>

        {/* Edges */}
        <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Relationships</div>
          <div className="space-y-1.5">
            {graphData?.edges?.map((edge, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs rounded px-3 py-1.5 font-mono" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--status-threat)' }}>{edge.source}</span>
                <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{edge.label}</span>
                <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--status-healthy)' }}>{edge.target}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
