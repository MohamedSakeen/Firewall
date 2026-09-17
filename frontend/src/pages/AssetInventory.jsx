import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import axios from 'axios';

const critStyle = (crit) => {
  switch (crit) {
    case 'CRITICAL': return { background: 'rgba(239,68,68,0.1)', color: '#f87171' };
    case 'HIGH': return { background: 'rgba(245,158,11,0.1)', color: '#fbbf24' };
    default: return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa' };
  }
};

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({ ip: '', hostname: '', role: 'Workstation', criticality: 'MEDIUM', segment: 'INTERNAL', owner: 'IT' });

  useEffect(() => { fetchAssets(); }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try { const res = await axios.get('http://localhost:5000/api/assets'); setAssets(res.data.assets || []); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAsset.ip) return;
    try { await axios.post('http://localhost:5000/api/assets', newAsset); setShowAddModal(false); setNewAsset({ ip: '', hostname: '', role: 'Workstation', criticality: 'MEDIUM', segment: 'INTERNAL', owner: 'IT' }); fetchAssets(); } catch (err) { console.error(err); }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '5px 8px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Assets</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Host criticality, segmentation, security posture</div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors" style={{ background: 'var(--accent)', color: '#fff' }}>
          <Plus size={14} /> Register
        </button>
      </div>

      {/* Assets Table */}
      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['IP / Hostname', 'Role', 'Segment', 'Owner', 'Criticality'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={5}>Loading...</td></tr>}
              {!loading && assets.length === 0 && <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={5}>No assets registered</td></tr>}
              {assets.map((asset, idx) => (
                <tr key={idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{asset.ip}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{asset.hostname}</div>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{asset.role}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: '#818cf8' }}>{asset.segment}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{asset.owner}</td>
                  <td className="px-3 py-2"><span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={critStyle(asset.criticality)}>{asset.criticality}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded space-y-3 p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)' }}>
            <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Register Asset</span>
              <button onClick={() => setShowAddModal(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>IP Address</label>
                <input type="text" required placeholder="e.g. 10.0.0.50" value={newAsset.ip} onChange={(e) => setNewAsset({...newAsset, ip: e.target.value})} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Hostname</label>
                <input type="text" placeholder="e.g. app-worker-01" value={newAsset.hostname} onChange={(e) => setNewAsset({...newAsset, hostname: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Role</label>
                <input type="text" placeholder="e.g. API Gateway" value={newAsset.role} onChange={(e) => setNewAsset({...newAsset, role: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Criticality</label>
                <select value={newAsset.criticality} onChange={(e) => setNewAsset({...newAsset, criticality: e.target.value})} style={inputStyle}>
                  <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs font-medium rounded" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium rounded" style={{ background: 'var(--accent)', color: '#fff' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
