import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import axios from 'axios';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

const scoreStyle = (score) => {
  if (score >= 70) return { background: 'rgba(239,68,68,0.15)', color: 'var(--color-threat)' };
  if (score >= 40) return { background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' };
  return { background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' };
};

export default function ThreatHunt() {
  const [srcIp, setSrcIp] = useState('');
  const [dstIp, setDstIp] = useState('');
  const [protocol, setProtocol] = useState('');
  const [minThreat, setMinThreat] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setCurrentPage(1);
    try {
      const res = await axios.post('http://localhost:5000/api/threat-hunt/query', {
        src_ip: srcIp || null, dst_ip: dstIp || null, protocol: protocol || null, min_threat_score: parseInt(minThreat) || 0,
      });
      setResults(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleClear = () => {
    setSrcIp('');
    setDstIp('');
    setProtocol('');
    setMinThreat(0);
    setResults(null);
    setCurrentPage(1);
  };

  const allFlows = results?.results || [];
  const startIndex = (currentPage - 1) * pageSize;
  const pagedFlows = allFlows.slice(startIndex, startIndex + pageSize);

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '12px', padding: '5px 8px', outline: 'none', width: '100%', fontFamily: 'var(--font-mono)',
  };

  return (
    <div className="space-y-4">
      {/* Header (Checklist Section 10) */}
      <div>
        <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Threat Hunt</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Pivot across flow telemetry, threat scores, and indicators</p>
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
            <input type="range" min="0" max="100" value={minThreat} onChange={(e) => setMinThreat(e.target.value)} className="w-full mt-1" style={{ accentColor: 'var(--color-primary)' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>Clear</button>
          <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--color-primary)', color: '#fff' }}>
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />} Run Query
          </button>
        </div>
      </form>

      {/* Results */}
      {results && (
        <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="px-3 py-2 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Matched Flows ({results.total_matches})
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Query Time: 1.2ms</span>
            </div>

            <ExportMenu
              filename="valaiaran-threat-hunt-results"
              data={allFlows}
              currentPageData={pagedFlows}
              columns={[
                { key: 'flow_id', label: 'Flow ID' },
                { key: 'src_ip', label: 'Source IP' },
                { key: 'dst_ip', label: 'Destination IP' },
                { key: 'dst_port', label: 'Port' },
                { key: 'protocol', label: 'Protocol' },
                { key: 'threat_score', label: 'Threat Score' },
                { key: 'bytes', label: 'Bytes' },
              ]}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Flow ID', 'Source IP', 'Dest IP', 'Port', 'Proto', 'Score', 'Bytes'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                {allFlows.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-sm text-[var(--text-muted)]" colSpan={7}>No flows matching query parameters</td></tr>
                )}
                {pagedFlows.map((f, idx) => (
                  <tr key={startIndex + idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-primary)' }}>{f.flow_id}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{f.src_ip}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{f.dst_ip}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-warning)' }}>{f.dst_port}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{f.protocol}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={scoreStyle(f.threat_score)}>{f.threat_score}</span>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{f.bytes} B</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 50 records/page Pagination (Checklist Section 12) */}
          <Pagination
            totalItems={allFlows.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
