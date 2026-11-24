import { useState, useEffect, useCallback } from 'react';
import { Play } from 'lucide-react';
import { simulatePolicy, counterfactualAnalysis, fetchIncidents } from '../services/api';

const display = (value) => value === null || value === undefined || value === '' ? '—' : value;

export default function PolicySimulatorView() {
  const [incidents, setIncidents] = useState([]);
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [action, setAction] = useState('BLOCK');
  const [simulationResult, setSimulationResult] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [attackerIp, setAttackerIp] = useState('');
  const [counterfactualResult, setCounterfactualResult] = useState(null);
  const [error, setError] = useState(null);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(Array.isArray(data?.incidents) ? data.incidents : []);
    } catch {
      setError('Unable to load incidents');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadIncidents, 0);
    return () => clearTimeout(timer);
  }, [loadIncidents]);

  const selectedIncident = incidents.find(inc => inc.incident_id === selectedIncidentId);

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!ip.trim() || !port.trim()) return;
    try {
      const res = await simulatePolicy({ ip: ip.trim(), port: Number(port), action });
      setSimulationResult(res.simulation_result);
      setError(null);
    } catch {
      setSimulationResult(null);
      setError('Simulation failed');
    }
  };

  const handleCounterfactual = async () => {
    if (!selectedIncidentId || !attackerIp.trim()) return;
    try {
      const res = await counterfactualAnalysis({ incident_id: selectedIncidentId, attacker_ip: attackerIp.trim() });
      setCounterfactualResult(res);
      setError(null);
    } catch {
      setCounterfactualResult(null);
      setError('Counterfactual analysis failed');
    }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Policy Simulator</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Simulate rule impacts and evaluate defensive what-if options</p>
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dry-Run Simulator</div>
          <form onSubmit={handleSimulate} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Target IP</label>
              <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP address" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} required />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Target Port</label>
              <input type="number" min="1" max="65535" value={port} onChange={(e) => setPort(e.target.value)} placeholder="Port" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} required />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)} style={inputStyle}>
                <option value="BLOCK">BLOCK</option><option value="RATE_LIMIT">RATE_LIMIT</option><option value="QUARANTINE">QUARANTINE</option>
              </select>
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--accent)', color: '#fff' }}>
              <Play size={12} /> Run Simulation
            </button>
          </form>

          {simulationResult && (
            <div className="rounded p-2.5 space-y-1.5 text-xs" style={{ background: 'var(--bg-inset)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Flows Analyzed:</span><span className="font-mono" style={{ color: 'var(--text-primary)' }}>{display(simulationResult.flows_analyzed)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Would Block:</span><span className="font-mono" style={{ color: 'var(--status-warning)' }}>{display(simulationResult.would_block)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>False-Block Rate:</span><span className="font-mono" style={{ color: 'var(--status-healthy)' }}>{display(simulationResult.false_block_rate)}</span></div>
              <div className="pt-1.5 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Recommendation:</span>
                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={{
                  background: simulationResult.recommendation === 'SAFE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: simulationResult.recommendation === 'SAFE' ? '#4ade80' : '#f87171',
                }}>{display(simulationResult.recommendation)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Counterfactual Defense</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Compare security vs availability trade-offs</div>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Incident</label>
              <select
                value={selectedIncidentId}
                onChange={(e) => { setSelectedIncidentId(e.target.value); setAttackerIp(incidents.find(inc => inc.incident_id === e.target.value)?.attacker_ip || ''); }}
                style={inputStyle}
              >
                <option value="">Select incident</option>
                {incidents.map(inc => <option key={inc.incident_id} value={inc.incident_id}>{inc.incident_id} — {inc.attacker_ip ?? 'unknown source'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Attacker IP</label>
              <input type="text" value={attackerIp} onChange={(e) => setAttackerIp(e.target.value)} placeholder="IP address" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>
          <button
            onClick={handleCounterfactual}
            disabled={!selectedIncidentId || !attackerIp.trim()}
            className="w-full py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
          >
            Evaluate Options for {selectedIncident?.incident_id ?? 'selected incident'}
          </button>

          {counterfactualResult && (
            <div className="space-y-1.5">
              {(counterfactualResult.options || []).length === 0 && (
                <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No counterfactual options returned</div>
              )}
              {(counterfactualResult.options || []).map((opt, i) => (
                <div key={opt.option ?? `option-${i}`} className="rounded p-2.5 text-xs" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between font-medium">
                    <span style={{ color: 'var(--text-heading)' }}>{display(opt.option)}</span>
                    <span className="font-mono" style={{ color: 'var(--accent)' }}>{display(opt.recommendation_score)}</span>
                  </div>
                  <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>Security: {display(opt.security_impact)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Availability: {display(opt.availability_impact)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
