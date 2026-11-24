<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { fetchAssets, registerAsset } from '../services/api';
=======
import { useState, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
import axios from 'axios';
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
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

<<<<<<< HEAD
const display = (value) => value === null || value === undefined || value === '' ? '—' : value;

const formatTime = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value * 1000).toLocaleString();
  return display(value);
};

const emptyAsset = { ip: '', hostname: '', role: '', criticality: '', segment: '', owner: '' };

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newAsset, setNewAsset] = useState(emptyAsset);
  const pageSize = 50;

  const loadAssets = useCallback(async () => {
    try {
      const data = await fetchAssets();
      setAssets(Array.isArray(data?.assets) ? data.assets : []);
      setError(null);
    } catch {
      setError('Unable to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadAssets, 0);
    return () => clearTimeout(timer);
  }, [loadAssets]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAsset.ip.trim()) return;
    try {
      await registerAsset({
        ip: newAsset.ip.trim(),
        hostname: newAsset.hostname.trim(),
        role: newAsset.role.trim(),
        criticality: newAsset.criticality,
        segment: newAsset.segment.trim(),
        owner: newAsset.owner.trim(),
      });
      setShowAddModal(false);
      setNewAsset(emptyAsset);
      setError(null);
      await loadAssets();
    } catch {
      setError('Unable to register asset');
=======
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
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
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
<<<<<<< HEAD
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Assets</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Host criticality, segmentation, and observed posture</p>
=======
      {/* Header (Checklist Section 10) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Assets</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Host criticality, segmentation, and security posture</p>
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
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
<<<<<<< HEAD
              { key: 'packet_count', label: 'Observed Packets' },
              { key: 'normal_services', label: 'Normal Services' },
              { key: 'bytes', label: 'Observed Bytes' },
              { key: 'last_seen', label: 'Last Seen' },
=======
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
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

<<<<<<< HEAD
      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

=======
      {/* Assets Table */}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
      <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
<<<<<<< HEAD
                {['IP / Hostname', 'Role', 'Segment', 'Owner', 'Criticality', 'Observed', 'Last Seen'].map(h => (
=======
                {['IP / Hostname', 'Role', 'Segment', 'Owner', 'Criticality'].map(h => (
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
<<<<<<< HEAD
              {loading && <tr><td className="px-3 py-6 text-center text-xs text-[var(--text-muted)]" colSpan={7}>Loading assets...</td></tr>}
              {!loading && filteredAssets.length === 0 && <tr><td className="px-3 py-6 text-center text-xs text-[var(--text-muted)]" colSpan={7}>No assets registered</td></tr>}
              {pagedAssets.map((asset, idx) => (
                <tr key={asset.ip ?? `asset-${startIndex + idx}`} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
=======
              {loading && <tr><td className="px-3 py-6 text-center text-xs text-[var(--text-muted)]" colSpan={5}>Loading assets...</td></tr>}
              {!loading && filteredAssets.length === 0 && <tr><td className="px-3 py-6 text-center text-xs text-[var(--text-muted)]" colSpan={5}>No assets registered</td></tr>}
              {pagedAssets.map((asset, idx) => (
                <tr key={startIndex + idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2">
<<<<<<< HEAD
                    <div className="font-mono text-xs font-medium text-[var(--text-primary)]">{display(asset.ip)}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{display(asset.hostname)}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{display(asset.role)}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{display(asset.segment)}</td>
                  <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{display(asset.owner)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={critStyle(asset.criticality)}>
                      {display(asset.criticality)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <div>{display(asset.packet_count)} pkts / {display(asset.bytes)} B</div>
                    <div>{(asset.normal_services || []).join(', ') || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{formatTime(asset.last_seen)}</td>
=======
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
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
                </tr>
              ))}
            </tbody>
          </table>
        </div>

<<<<<<< HEAD
=======
        {/* 50 records/page Pagination (Checklist Section 12) */}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        <Pagination
          totalItems={filteredAssets.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

<<<<<<< HEAD
=======
      {/* Add Modal */}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
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
<<<<<<< HEAD
                <input type="text" required placeholder="IP address" value={newAsset.ip} onChange={(e) => setNewAsset({ ...newAsset, ip: e.target.value })} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Hostname</label>
                <input type="text" placeholder="Hostname" value={newAsset.hostname} onChange={(e) => setNewAsset({ ...newAsset, hostname: e.target.value })} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Role</label>
                  <input type="text" required placeholder="Role" value={newAsset.role} onChange={(e) => setNewAsset({ ...newAsset, role: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Criticality</label>
                  <select required value={newAsset.criticality} onChange={(e) => setNewAsset({ ...newAsset, criticality: e.target.value })} style={inputStyle}>
                    <option value="">Select criticality</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                    <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Segment</label>
                  <input type="text" required placeholder="Segment" value={newAsset.segment} onChange={(e) => setNewAsset({ ...newAsset, segment: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5 text-[var(--text-muted)]">Owner</label>
                  <input type="text" required placeholder="Owner" value={newAsset.owner} onChange={(e) => setNewAsset({ ...newAsset, owner: e.target.value })} style={inputStyle} />
                </div>
=======
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
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
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
