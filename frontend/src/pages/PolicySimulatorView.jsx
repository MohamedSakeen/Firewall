import { useState } from 'react';
import axios from 'axios';
import { Play } from 'lucide-react';

export default function PolicySimulatorView() {
  const [ip, setIp] = useState('10.0.0.99');
  const [port, setPort] = useState('445');
  const [action, setAction] = useState('BLOCK');
  const [simulationResult, setSimulationResult] = useState(null);
  const [counterfactualResult, setCounterfactualResult] = useState(null);

  const handleSimulate = async (e) => {
    e.preventDefault();
    try { const res = await axios.post('http://localhost:5000/api/simulation/simulate', { ip, port: parseInt(port) || null, action }); setSimulationResult(res.data.simulation_result); } catch (err) { console.error('Simulation failed:', err); }
  };

  const handleCounterfactual = async () => {
    try { const res = await axios.post('http://localhost:5000/api/simulation/counterfactual', { incident_id: 'INC-1001', attacker_ip: ip }); setCounterfactualResult(res.data); } catch (err) { console.error('Counterfactual failed:', err); }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Policy Simulator</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Simulate rule impacts & evaluate what-if defensive options</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Simulator */}
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dry-Run Simulator</div>
          <form onSubmit={handleSimulate} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Target IP</label>
              <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Target Port</label>
              <input type="text" value={port} onChange={(e) => setPort(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
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
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Flows Analyzed:</span><span className="font-mono" style={{ color: 'var(--text-primary)' }}>{simulationResult.flows_analyzed}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Would Block:</span><span className="font-mono" style={{ color: 'var(--status-warning)' }}>{simulationResult.would_block}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>False-Block Rate:</span><span className="font-mono" style={{ color: 'var(--status-healthy)' }}>{simulationResult.false_block_rate}%</span></div>
              <div className="pt-1.5 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Recommendation:</span>
                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={{
                  background: simulationResult.recommendation === 'SAFE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: simulationResult.recommendation === 'SAFE' ? '#4ade80' : '#f87171',
                }}>{simulationResult.recommendation}</span>
              </div>
            </div>
          )}
        </div>

        {/* Counterfactual */}
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Counterfactual Defense</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Compare security vs availability trade-offs</div>
          <button onClick={handleCounterfactual} className="w-full py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
            Evaluate Options for {ip}
          </button>

          {counterfactualResult && (
            <div className="space-y-1.5">
              {counterfactualResult.options.map((opt, i) => (
                <div key={i} className="rounded p-2.5 text-xs" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between font-medium">
                    <span style={{ color: 'var(--text-heading)' }}>{opt.option}</span>
                    <span className="font-mono" style={{ color: 'var(--accent)' }}>{opt.recommendation_score}/100</span>
                  </div>
                  <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>Security: {opt.security_impact}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Availability: {opt.availability_impact}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
