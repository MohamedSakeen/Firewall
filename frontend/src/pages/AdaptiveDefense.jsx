import { useState, useEffect, useCallback } from 'react';
import {
  fetchShadowRules, addShadowRule, promoteShadowRule, verifyResponse,
  fetchResponseRecommendations,
} from '../services/api';
import { connectSocket } from '../services/socket';

export default function AdaptiveDefense() {
  const [recommendations, setRecommendations] = useState(null);
  const [shadowRules, setShadowRules] = useState([]);
  const [shadowLoading, setShadowLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(null);
  const [verificationInput, setVerificationInput] = useState({ pps_before: '', pps_after: '', min_reduction_pct: '' });
  const [verificationResult, setVerificationResult] = useState(null);
  const [threatScore, setThreatScore] = useState('');
  const [criticality, setCriticality] = useState('');
  const [newShadowRule, setNewShadowRule] = useState({ rule_id: '', target_ip: '', target_port: '', action: 'BLOCK' });

  const loadShadowRules = useCallback(async () => {
    try {
      const data = await fetchShadowRules();
      setShadowRules(Array.isArray(data?.shadow_rules) ? data.shadow_rules : []);
      setError(null);
    } catch {
      setError('Unable to load shadow rules');
    } finally {
      setShadowLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadShadowRules, 0);
    const socket = connectSocket();
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const socketTimer = setTimeout(() => setSocketConnected(socket.connected), 0);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('response.recommended', loadShadowRules);
    socket.on('response.verified', loadShadowRules);
    return () => {
      clearTimeout(timer);
      clearTimeout(socketTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('response.recommended', loadShadowRules);
      socket.off('response.verified', loadShadowRules);
    };
  }, [loadShadowRules]);

  const getRecommendation = async () => {
    if (threatScore === '' || !criticality) return;
    try {
      const data = await fetchResponseRecommendations({
        threat_score: Number(threatScore),
        criticality,
        is_honeypot: false,
      });
      setRecommendations(data);
    } catch {
      setRecommendations(null);
    }
  };

  const handleAddShadowRule = async (e) => {
    e.preventDefault();
    const { rule_id, target_ip, target_port, action } = newShadowRule;
    if (!rule_id.trim() || !target_ip.trim() || !target_port.trim() || !action) return;
    try {
      await addShadowRule({ rule_id: rule_id.trim(), target_ip: target_ip.trim(), target_port: Number(target_port), action });
      setNewShadowRule({ rule_id: '', target_ip: '', target_port: '', action: 'BLOCK' });
      await loadShadowRules();
    } catch {
      setError('Unable to add shadow rule');
    }
  };

  const handlePromoteShadowRule = async (rule_id) => {
    if (!rule_id) return;
    try {
      await promoteShadowRule({ rule_id });
      await loadShadowRules();
    } catch {
      setError('Unable to promote shadow rule');
    }
  };

  const handleVerifyResponse = async () => {
    const { pps_before, pps_after, min_reduction_pct } = verificationInput;
    if (pps_before === '' || pps_after === '' || min_reduction_pct === '') return;
    try {
      const data = await verifyResponse({
        pps_before: Number(pps_before),
        pps_after: Number(pps_after),
        min_reduction_pct: Number(min_reduction_pct),
      });
      setVerificationResult(data);
    } catch {
      setVerificationResult(null);
    }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '5px 8px', outline: 'none', width: '100%',
  };

  const shadowModes = [...new Set(shadowRules.map(r => r.mode).filter(Boolean))];
  const shadowStatus = shadowModes.length > 0 ? shadowModes.join(' / ') : null;
  const statusColor = socketConnected ? 'var(--color-success)' : socketConnected === false ? 'var(--color-threat)' : 'var(--color-warning)';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Adaptive Defense</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Response recommendations, shadow rules, and mitigation verification</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: statusColor }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          {socketConnected === null ? 'CONNECTING…' : socketConnected ? 'CONNECTED' : 'OFFLINE'}
        </div>
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Response Policy Calculator</div>
          <div className="space-y-2 rounded p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Threat Score</label>
              <input type="number" min="0" max="100" value={threatScore} onChange={e => setThreatScore(e.target.value)} placeholder="Enter threat score" style={inputStyle} />
            </div>
            <div>
              <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Asset Criticality</label>
              <select value={criticality} onChange={e => setCriticality(e.target.value)} style={inputStyle}>
                <option value="">Select criticality</option>
                <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <button
              onClick={getRecommendation}
              disabled={threatScore === '' || !criticality}
              className="w-full py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Calculate Recommendation
            </button>
            {recommendations && (
              <div className="rounded p-2 text-xs space-y-1" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Recommended:</span><span className="font-mono font-medium" style={{ color: 'var(--accent)' }}>{recommendations.recommended_action ?? '—'}</span></div>
                <div style={{ color: 'var(--text-secondary)' }}>{recommendations.reason ?? '—'}</div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex justify-between items-center">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Shadow Rules</div>
            {shadowStatus && (
              <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(234,179,8,0.1)', color: '#facc15' }}>{shadowStatus}</span>
            )}
          </div>
          <form onSubmit={handleAddShadowRule} className="grid grid-cols-2 gap-2">
            <input type="text" value={newShadowRule.rule_id} onChange={e => setNewShadowRule({ ...newShadowRule, rule_id: e.target.value })} placeholder="Rule ID" style={inputStyle} required />
            <input type="text" value={newShadowRule.target_ip} onChange={e => setNewShadowRule({ ...newShadowRule, target_ip: e.target.value })} placeholder="Target IP" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} required />
            <input type="number" min="1" max="65535" value={newShadowRule.target_port} onChange={e => setNewShadowRule({ ...newShadowRule, target_port: e.target.value })} placeholder="Target port" style={inputStyle} required />
            <select value={newShadowRule.action} onChange={e => setNewShadowRule({ ...newShadowRule, action: e.target.value })} style={inputStyle}>
              <option value="BLOCK">BLOCK</option><option value="RATE_LIMIT">RATE_LIMIT</option><option value="MONITOR">MONITOR</option>
            </select>
            <button type="submit" className="col-span-2 shrink-0 px-2.5 py-1 text-xs font-medium rounded transition-colors" style={{ background: 'var(--status-warning)', color: '#000' }}>Add Rule</button>
          </form>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {shadowLoading && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading shadow rules...</div>}
            {!shadowLoading && shadowRules.length === 0 && (
              <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No shadow rules configured</div>
            )}
            {shadowRules.map((rule, idx) => (
              <div key={rule.rule_id ?? `shadow-${idx}`} className="rounded p-2 flex justify-between items-center text-xs" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{rule.rule_id ?? '—'}: {rule.target_ip ?? '—'}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Hits: {rule.matches ?? '—'} | Legit: {rule.legitimate_matches ?? '—'} | {rule.mode ?? '—'}</div>
                </div>
                {rule.mode === 'SHADOW' && (
                  <button onClick={() => handlePromoteShadowRule(rule.rule_id)} className="px-2 py-1 text-[11px] font-medium rounded transition-colors" style={{ background: 'var(--status-healthy)', color: '#fff' }}>Promote</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Response Verification</div>
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Before/after throughput comparison for mitigation proof</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Pre-Mitigation PPS</label>
            <input type="number" min="0" value={verificationInput.pps_before} onChange={e => setVerificationInput({ ...verificationInput, pps_before: e.target.value })} placeholder="Enter value" style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Post-Mitigation PPS</label>
            <input type="number" min="0" value={verificationInput.pps_after} onChange={e => setVerificationInput({ ...verificationInput, pps_after: e.target.value })} placeholder="Enter value" style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Min Reduction (%)</label>
            <input type="number" min="0" max="100" value={verificationInput.min_reduction_pct} onChange={e => setVerificationInput({ ...verificationInput, min_reduction_pct: e.target.value })} placeholder="Enter value" style={inputStyle} />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleVerifyResponse}
              disabled={Object.values(verificationInput).some(v => v === '')}
              className="w-full py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50"
              style={{ background: 'var(--status-healthy)', color: '#fff' }}
            >
              Verify
            </button>
          </div>
        </div>
        {verificationResult && (
          <div className="rounded p-2.5 text-sm" style={{
            background: verificationResult.status === 'SUCCESS' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${verificationResult.status === 'SUCCESS' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: verificationResult.status === 'SUCCESS' ? '#4ade80' : '#f87171',
          }}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="font-medium text-xs">Outcome: {verificationResult.status ?? '—'}</span>
              <span className="font-mono text-sm font-semibold">{verificationResult.effectiveness_pct ?? '—'}{verificationResult.effectiveness_pct !== undefined ? '%' : ''}</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{verificationResult.message ?? '—'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
