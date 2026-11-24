import { useState, useEffect, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { fetchIncidentGraph } from '../services/api';
import { connectSocket } from '../services/socket';

const display = (value) => value === null || value === undefined || value === '' ? '—' : value;

export default function AttackGraphView({ incidentId: incidentIdProp } = {}) {
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const queryId = new URLSearchParams(window.location.search).get('incident');
  const storedId = localStorage.getItem('selectedIncidentId');
  const selectedId = incidentIdProp || queryId || storedId || null;

  const loadGraph = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const data = await fetchIncidentGraph(selectedId);
      setGraphData(data);
      setError(null);
    } catch (err) {
      setGraphData(null);
      setError(err?.response?.status === 404 ? 'Attack graph unavailable for this incident' : 'Unable to load attack graph');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const timer = setTimeout(loadGraph, 0);
    const socket = connectSocket();
    const onUpdated = (incident) => {
      if (!incident?.incident_id || incident.incident_id === selectedId) loadGraph();
    };
    socket.on('incident.updated', onUpdated);
    return () => { clearTimeout(timer); socket.off('incident.updated', onUpdated); };
  }, [selectedId, loadGraph]);

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
        <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Attack Graph</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Attacker pathways, targeted assets, and kill-chain stages</p>
      </div>

      {!selectedId && (
        <div className="rounded p-6 text-center text-sm" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          No incident selected
        </div>
      )}

      {selectedId && (
        <div className="rounded p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
            Topology: {display(graphData?.incident_id ?? selectedId)}
          </div>

          {error && (
            <div className="rounded px-3 py-2 mb-4 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
              {error}
            </div>
          )}
          {loading && <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Loading graph...</div>}

          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Nodes</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {(graphData?.nodes || []).length === 0 && !loading && (
              <div className="text-xs col-span-full" style={{ color: 'var(--text-muted)' }}>No graph nodes available</div>
            )}
            {(graphData?.nodes || []).map((node) => (
              <div key={node.id ?? `${node.label ?? ''}-${node.type ?? ''}`} className="rounded p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{display(node.type)}</span>
                </div>
                <div className="text-sm font-medium mt-1.5" style={nodeTypeStyle(node.type)}>{display(node.label)}</div>
                <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{display(node.id)}</div>
              </div>
            ))}
          </div>

          <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Relationships</div>
            <div className="space-y-1.5">
              {(graphData?.edges || []).length === 0 && !loading && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No graph relationships available</div>
              )}
              {(graphData?.edges || []).map((edge, idx) => (
                <div key={`${edge.source ?? ''}-${edge.target ?? ''}-${idx}`} className="flex items-center gap-2 text-xs rounded px-3 py-1.5 font-mono" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--status-threat)' }}>{display(edge.source)}</span>
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{display(edge.label)}</span>
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--status-healthy)' }}>{display(edge.target)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
