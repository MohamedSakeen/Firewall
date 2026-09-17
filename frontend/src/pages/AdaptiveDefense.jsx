import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdaptiveDefense() {
  const [recommendations, setRecommendations] = useState(null);
  const [shadowRules, setShadowRules] = useState([]);
  const [verificationInput, setVerificationInput] = useState({ pps_before: 850, pps_after: 12, min_reduction_pct: 90.0 });
  const [verificationResult, setVerificationResult] = useState(null);
  const [threatScore, setThreatScore] = useState(78);
  const [criticality, setCriticality] = useState('MEDIUM');
  const [newShadowIp, setNewShadowIp] = useState('192.168.1.180');

  useEffect(() => { fetchShadowRules(); getRecommendation(threatScore, criticality); }, []);

  const fetchShadowRules = async () => {
    try { const res = await axios.get('http://localhost:5000/api/responses/shadow'); setShadowRules(res.data.shadow_rules || []); } catch (err) { console.error(err); }
  };

  const getRecommendation = async (score, crit) => {
    try { const res = await axios.get(`http://localhost:5000/api/responses/recommendations?threat_score=${score}&criticality=${crit}`); setRecommendations(res.data); } catch (err) { console.error(err); }
  };

  const addShadowRule = async () => {
    try { await axios.post('http://localhost:5000/api/responses/shadow', { target_ip: newShadowIp, target_port: 80, action: 'BLOCK' }); fetchShadowRules(); } catch (err) { console.error(err); }
  };

  const promoteShadowRule = async (rule_id) => {
    try { await axios.post('http://localhost:5000/api/responses/shadow/promote', { rule_id }); fetchShadowRules(); } catch (err) { console.error(err); }
  };

  const verifyResponse = async () => {
    try { const res = await axios.post('http://localhost:5000/api/responses/verify', verificationInput); setVerificationResult(res.data); } catch (err) { console.error(err); }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '5px 8px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Adaptive Defense</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Response recommendations, shadow rules, mitigation verification</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recommendation Engine */}
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Response Policy Calculator</div>
          <div className="space-y-2 rounded p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Threat Score: {threatScore}</label>
              <input type="range" min="0" max="100" value={threatScore} onChange={(e) => { const val = parseInt(e.target.value); setThreatScore(val); getRecommendation(val, criticality); }} className="w-full" style={{ accentColor: 'var(--accent)' }} />
            </div>
            <div>
              <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Asset Criticality</label>
              <select value={criticality} onChange={(e) => { setCriticality(e.target.value); getRecommendation(threatScore, e.target.value); }} style={inputStyle}>
                <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            {recommendations && (
              <div className="rounded p-2 text-xs space-y-1" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Recommended:</span><span className="font-mono font-medium" style={{ color: 'var(--accent)' }}>{recommendations.recommended_action}</span></div>
                <div style={{ color: 'var(--text-secondary)' }}>{recommendations.reason}</div>
              </div>
            )}
          </div>
        </div>

        {/* Shadow Rules */}
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex justify-between items-center">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Shadow Rules</div>
            <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(234,179,8,0.1)', color: '#facc15' }}>NON-BLOCKING</span>
          </div>
          <div className="flex gap-2">
            <input type="text" value={newShadowIp} onChange={(e) => setNewShadowIp(e.target.value)} placeholder="Target IP" style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
            <button onClick={addShadowRule} className="shrink-0 px-2.5 py-1 text-xs font-medium rounded transition-colors" style={{ background: 'var(--status-warning)', color: '#000' }}>Add</button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {shadowRules.map((rule, idx) => (
              <div key={idx} className="rounded p-2 flex justify-between items-center text-xs" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{rule.rule_id}: {rule.target_ip}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Hits: {rule.matches} | Legit: {rule.legitimate_matches} | {rule.mode}</div>
                </div>
                {rule.mode === 'SHADOW' && (
                  <button onClick={() => promoteShadowRule(rule.rule_id)} className="px-2 py-1 text-[11px] font-medium rounded transition-colors" style={{ background: 'var(--status-healthy)', color: '#fff' }}>Promote</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification */}
      <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Response Verification</div>
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Before/after throughput comparison for mitigation proof</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Pre-Mitigation PPS</label>
            <input type="number" value={verificationInput.pps_before} onChange={(e) => setVerificationInput({...verificationInput, pps_before: parseFloat(e.target.value)})} style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Post-Mitigation PPS</label>
            <input type="number" value={verificationInput.pps_after} onChange={(e) => setVerificationInput({...verificationInput, pps_after: parseFloat(e.target.value)})} style={inputStyle} />
          </div>
          <div className="flex items-end">
            <button onClick={verifyResponse} className="w-full py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--status-healthy)', color: '#fff' }}>Verify</button>
          </div>
        </div>
        {verificationResult && (
          <div className="rounded p-2.5 text-sm" style={{
            background: verificationResult.status === 'SUCCESS' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${verificationResult.status === 'SUCCESS' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: verificationResult.status === 'SUCCESS' ? '#4ade80' : '#f87171',
          }}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="font-medium text-xs">Outcome: {verificationResult.status}</span>
              <span className="font-mono text-sm font-semibold">{verificationResult.effectiveness_pct}%</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{verificationResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
