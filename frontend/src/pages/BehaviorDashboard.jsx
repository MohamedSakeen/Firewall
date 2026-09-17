import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function BehaviorDashboard() {
  const [baselines, setBaselines] = useState([]);
  const [drifts, setDrifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [learningMode, setLearningMode] = useState('MONITORING');
  const [trustGateSample, setTrustGateSample] = useState({ anomaly_score: 0.12, threat_score: 15, is_quarantined: false });
  const [trustGateResult, setTrustGateResult] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [baseRes, driftRes] = await Promise.all([
        axios.get('http://localhost:5000/api/learning/baselines').catch(() => ({ data: { baselines: [] } })),
        axios.get('http://localhost:5000/api/learning/drift').catch(() => ({ data: { drift_events: [] } })),
      ]);
      setBaselines(baseRes.data.baselines || []);
      setDrifts(driftRes.data.drift_events || []);
    } catch (err) {
      console.error("Failed to load behavior data", err);
    } finally {
      setLoading(false);
    }
  };

  const testTrustGate = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/learning/trust-gate', trustGateSample);
      setTrustGateResult(res.data);
    } catch (err) { console.error(err); }
  };

  const modeStyle = (mode) => {
    switch (mode) {
      case 'LEARNING': return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa' };
      case 'MONITORING': return { background: 'rgba(234,179,8,0.1)', color: '#facc15' };
      default: return { background: 'rgba(34,197,94,0.1)', color: '#4ade80' };
    }
  };

  const critStyle = (crit) => {
    switch (crit) {
      case 'CRITICAL': return { background: 'rgba(239,68,68,0.1)', color: '#f87171' };
      case 'HIGH': return { background: 'rgba(245,158,11,0.1)', color: '#fbbf24' };
      default: return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa' };
    }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '5px 8px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Baselines</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Per-asset statistical learning, trust gate & drift detection</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={modeStyle(learningMode)}>{learningMode}</span>
          <button onClick={fetchData} className="p-1.5 rounded transition-colors" style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Learned Profiles', value: baselines.length, sub: 'Convergence 96%', color: 'var(--text-heading)' },
          { label: 'Concept Drifts', value: drifts.length, sub: 'Pending validation', color: 'var(--status-warning)' },
          { label: 'Poisoning Defense', value: 'ACTIVE', sub: 'Trust Gate Enforced', color: 'var(--status-healthy)' },
          { label: 'Baseline Schema', value: 'v1.4', sub: 'Deterministic EWMA', color: 'var(--text-heading)' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded px-3 py-2.5" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</div>
            <div className="text-lg font-semibold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Baselines Table */}
      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Per-Asset Learned Profiles</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Asset IP', 'Role', 'Criticality', 'Confidence', 'Observations', 'Services', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {baselines.map((b, idx) => (
                <tr key={idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{b.asset_ip}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{b.hostname || 'Dynamic Host'}</div>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{b.role || 'Workstation'}</td>
                  <td className="px-3 py-2"><span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={critStyle(b.criticality)}>{b.criticality}</span></td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--status-healthy)' }}>{(b.confidence * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{b.sample_count}</td>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{(b.normal_services || []).join(', ')}</td>
                  <td className="px-3 py-2"><span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>{b.status || 'STABLE'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Gate & Drift */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Trust Gate */}
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Trust Gate Evaluator</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Anti-poisoning gate for baseline training eligibility</div>
          <div className="space-y-2 rounded p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Anomaly Score (0-1)</label>
              <input type="number" step="0.05" min="0" max="1" value={trustGateSample.anomaly_score}
                onChange={(e) => setTrustGateSample({...trustGateSample, anomaly_score: parseFloat(e.target.value)})} style={inputStyle} />
            </div>
            <div>
              <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Threat Score (0-100)</label>
              <input type="number" min="0" max="100" value={trustGateSample.threat_score}
                onChange={(e) => setTrustGateSample({...trustGateSample, threat_score: parseInt(e.target.value)})} style={inputStyle} />
            </div>
            <button onClick={testTrustGate} className="w-full py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--status-healthy)', color: '#fff' }}>
              Evaluate
            </button>
            {trustGateResult && (
              <div className="rounded p-2 text-xs" style={{
                background: trustGateResult.is_trusted ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${trustGateResult.is_trusted ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: trustGateResult.is_trusted ? '#4ade80' : '#f87171',
              }}>
                <div className="font-medium">Gate: {trustGateResult.gate_action}</div>
                <div>Eligible: {trustGateResult.is_trusted ? "YES" : "NO (Rejected)"}</div>
              </div>
            )}
          </div>
        </div>

        {/* Concept Drifts */}
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Concept Drifts</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Network changes flagged for administrator approval</div>
          <div className="space-y-2">
            {drifts.map((d, idx) => (
              <div key={idx} className="rounded p-2.5 space-y-1.5 text-xs" style={{ background: 'var(--bg-inset)', border: '1px solid rgba(234,179,8,0.15)' }}>
                <div className="flex justify-between items-start">
                  <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{d.asset_ip}</span>
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(234,179,8,0.1)', color: '#facc15' }}>{d.drift_type}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{d.details}</div>
                <div className="flex justify-between items-center pt-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Action: {d.action_required}</span>
                  <button className="px-2 py-1 text-[11px] font-medium rounded transition-colors" style={{ background: 'var(--accent)', color: '#fff' }}>
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
