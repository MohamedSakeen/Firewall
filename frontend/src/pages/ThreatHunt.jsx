import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import axios from 'axios';

const scoreStyle = (score) => {
  if (score >= 70) return { background: 'rgba(239,68,68,0.1)', color: '#f87171' };
  if (score >= 40) return { background: 'rgba(245,158,11,0.1)', color: '#fbbf24' };
  return { background: 'rgba(34,197,94,0.1)', color: '#4ade80' };
};

export default function ThreatHunt() {
  const [srcIp, setSrcIp] = useState('');
  const [dstIp, setDstIp] = useState('');
  const [protocol, setProtocol] = useState('');
  const [minThreat, setMinThreat] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/threat-hunt/query', {
        src_ip: srcIp || null, dst_ip: dstIp || null, protocol: protocol || null, min_threat_score: parseInt(minThreat) || 0,
      });
      setResults(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '12px', padding: '5px 8px', outline: 'none', width: '100%', fontFamily: 'var(--font-mono)',
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Threat Hunt</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Pivot across flow telemetry, threat scores, and indicators</div>
      </div>

      {/* Query Builder */}
      <form onSubmit={handleSearch} className="rounded p-3 space-y-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Flow Filter</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Source IP</label>
            <input type="text" placeholder="e.g. 192.168.1.105" value={srcIp} onChange={(e) => setSrcIp(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Destination IP</label>
            <input type="text" placeholder="e.g. 10.0.0.10" value={dstIp} onChange={(e) => setDstIp(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Protocol</label>
            <select value={protocol} onChange={(e) => setProtocol(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-sans)' }}>
              <option value="">ALL</option><option value="TCP">TCP</option><option value="UDP">UDP</option><option value="ICMP">ICMP</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Min Threat ({minThreat})</label>
            <input type="range" min="0" max="100" value={minThreat} onChange={(e) => setMinThreat(e.target.value)} className="w-full mt-1" style={{ accentColor: 'var(--accent)' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => { setSrcIp(''); setDstIp(''); setProtocol(''); setMinThreat(0); setResults(null); }}
            className="px-3 py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>Clear</button>
          <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--accent)', color: '#fff' }}>
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />} Run Query
          </button>
        </div>
      </form>

      {/* Results */}
      {results && (
        <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="px-3 py-2 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Matched Flows ({results.total_matches})</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Query Time: 1.2ms</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Flow ID', 'Source IP', 'Dest IP', 'Port', 'Proto', 'Score', 'Bytes'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                {results.results.map((f, idx) => (
                  <tr key={idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--accent)' }}>{f.flow_id}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{f.src_ip}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{f.dst_ip}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--status-warning)' }}>{f.dst_port}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{f.protocol}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={scoreStyle(f.threat_score)}>{f.threat_score}</span>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{f.bytes} B</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
