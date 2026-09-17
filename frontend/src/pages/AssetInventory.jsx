import { useState, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
import axios from 'axios';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

const critStyle = (crit) => {
  switch (crit?.toUpperCase()) {
    case 'CRITICAL': return { background: 'rgba(239,68,68,0.15)', color: 'var(--color-threat)' };
    case 'HIGH': return { background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' };
    case 'MEDIUM': return { background: 'rgba(245,158,11,0.10)', color: 'var(--color-warning)' };
    default: return { background: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)' };
  }
};

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [newAsset, setNewAsset] = useState({ ip: '', hostname: '', role: 'Workstation', criticality: 'MEDIUM', segment: 'INTERNAL', owner: 'IT' });

  useEffect(() => { fetchAssets(); }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/assets');
      setAssets(res.data.assets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAsset.ip) return;
    try {
      await axios.post('http://localhost:5000/api/assets', newAsset);
      setShowAddModal(false);
      setNewAsset({ ip: '', hostname: '', role: 'Workstation', criticality: 'MEDIUM', segment: 'INTERNAL', owner: 'IT' });
      fetchAssets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const filteredAssets = assets.filter(a =>
    !search ||
    a.ip?.includes(search) ||
    a.hostname?.toLowerCase().includes(search.toLowerCase()) ||
    a.role?.toLowerCase().includes(search.toLowerCase()) ||
    a.segment?.toLowerCase().includes(search.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const pagedAssets = filteredAssets.slice(startIndex, startIndex + pageSize);

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '5px 8px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      {/* Header (Checklist Section 10) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Assets</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Host criticality, segmentation, and security posture</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search assets..."
              className="text-xs rounded pl-7 pr-2 py-1 outline-none font-mono"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: 160 }}
            />
          </div>

          <ExportMenu
            filename="valaiaran-asset-inventory"
            data={filteredAssets}
            currentPageData={pagedAssets}
            columns={[
              { key: 'ip', label: 'IP Address' },
              { key: 'hostname', label: 'Hostname' },
              { key: 'role', label: 'Role' },
              { key: 'segment', label: 'Segment' },
              { key: 'owner', label: 'Owner' },
              { key: 'criticality', label: 'Criticality' },
            ]}
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={14} /> Register
          </button>
        </div>
      </div>

      {/* Assets Table */}
      <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['IP / Hostname', 'Role', 'Segment', 'Owner', 'Criticality'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && <tr><td className="px-3 py-6 text-center text-xs text-[var(--text-muted)]" colSpan={5}>Loading assets...</td></tr>}
              {!loading && filteredAssets.length === 0 && <tr><td className="px-3 py-6 text-center text-xs text-[var(--text-muted)]" colSpan={5}>No assets registered</td></tr>}
              {pagedAssets.map((asset, idx) => (
                <tr key={startIndex + idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs font-medium text-[var(--text-primary)]">{asset.ip}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{asset.hostname}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{asset.role}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{asset.segment}</td>
                  <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{asset.owner}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={critStyle(asset.criticality)}>
                      {asset.criticality}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 50 records/page Pagination (Checklist Section 12) */}
        <Pagination
          totalItems={filteredAssets.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded space-y-3 p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)' }}>
            <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-sm font-semibold text-[var(--text-heading)]">Register Asset</span>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)]"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">IP Address</label>
                <input type="text" required placeholder="e.g. 10.0.0.50" value={newAsset.ip} onChange={(e) => setNewAsset({...newAsset, ip: e.target.value})} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Hostname</label>
                <input type="text" placeholder="e.g. app-worker-01" value={newAsset.hostname} onChange={(e) => setNewAsset({...newAsset, hostname: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Role</label>
                <input type="text" placeholder="e.g. API Gateway" value={newAsset.role} onChange={(e) => setNewAsset({...newAsset, role: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Criticality</label>
                <select value={newAsset.criticality} onChange={(e) => setNewAsset({...newAsset, criticality: e.target.value})} style={inputStyle}>
                  <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs font-medium rounded text-[var(--text-secondary)]">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium rounded text-white" style={{ background: 'var(--color-primary)' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
