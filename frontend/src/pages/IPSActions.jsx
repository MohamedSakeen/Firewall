import { useState, useEffect } from 'react';
import { Clock, Unlock, Plus, X, CheckCircle, Search } from 'lucide-react';
import { fetchBlocked, unblockIp, blockIp } from '../services/api';
import { connectSocket } from '../services/socket';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

export default function IPSActions() {
  const [blockList, setBlockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('Manual Block');
  const [autoBlock, setAutoBlock] = useState(true);
  const [notification, setNotification] = useState(null);

  const loadBlocked = async () => {
    try {
      const data = await fetchBlocked();
      setBlockList(data || []);
    } catch {
      console.warn('Failed to fetch blocked IPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocked();
    const interval = setInterval(loadBlocked, 10000);
    const socket = connectSocket();
    socket.on('block', () => { loadBlocked(); });
    return () => { clearInterval(interval); socket.off('block'); };
  }, []);

  const handleUnblock = async (ip) => {
    try {
      await unblockIp(ip);
      setBlockList(prev => prev.filter(b => b.ip !== ip));
      setNotification({ type: 'success', message: `IP ${ip} unblocked successfully.` });
    } catch {
      setNotification({ type: 'error', message: 'Failed to unblock IP' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleManualBlock = async (e) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    try {
      await blockIp(manualIp.trim(), manualReason.trim() || 'Manual Block');
      setManualIp('');
      setModalOpen(false);
      await loadBlocked();
      setNotification({ type: 'success', message: `IP ${manualIp} blocked successfully.` });
    } catch {
      setNotification({ type: 'error', message: 'Failed to block target IP' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const filteredList = blockList.filter(b =>
    b.ip?.includes(search) ||
    b.reason?.toLowerCase().includes(search.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const pagedList = filteredList.slice(startIndex, startIndex + pageSize);

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium"
          style={{
            background: notification.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${notification.type === 'success' ? 'var(--color-success)' : 'var(--color-threat)'}`,
            color: notification.type === 'success' ? 'var(--color-success)' : 'var(--color-threat)',
          }}
        >
          <CheckCircle size={14} />
          {notification.message}
        </div>
      )}

      {/* Header (Checklist Section 10) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">IPS Actions</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Active IP quarantine, ban enforcement, and threat mitigation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>Auto-Block:</span>
            <button
              onClick={() => setAutoBlock(!autoBlock)}
              className="relative w-8 h-4 rounded-full transition-colors"
              style={{ background: autoBlock ? 'var(--color-primary)' : 'var(--border-strong)' }}
            >
              <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform" style={{ left: autoBlock ? 16 : 2 }} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search IP or reason..."
              className="text-xs rounded pl-7 pr-2 py-1 outline-none font-mono"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: 170 }}
            />
          </div>

          <ExportMenu
            filename="valaiaran-ips-actions"
            data={filteredList}
            currentPageData={pagedList}
            columns={[
              { key: 'ip', label: 'IP Address' },
              { key: 'reason', label: 'Reason' },
              { key: 'blockedAt', label: 'Blocked At' },
              { key: 'expires', label: 'Expires' },
            ]}
          />

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            <Plus size={14} /> Block IP
          </button>
        </div>
      </div>

      <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--color-threat)' }}>
            Blocked & Quarantined ({filteredList.length})
          </span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            Active ban table
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['IP Address', 'Reason', 'Blocked At', 'Expires', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && (
                <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={5}>Loading...</td></tr>
              )}
              {!loading && filteredList.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={5}>No IPs currently quarantined</td></tr>
              )}
              {pagedList.map((b, i) => (
                <tr
                  key={startIndex + i}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--color-threat)' }}>{b.ip}</td>
                  <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{b.reason}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{b.blockedAt}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center text-xs font-mono gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={11} style={{ color: 'var(--color-primary)' }} /> {b.expires}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleUnblock(b.ip)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors"
                      style={{ background: 'var(--accent-muted)', color: 'var(--color-primary)' }}
                    >
                      <Unlock size={12} /> Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 50 records/page Pagination (Checklist Section 12) */}
        <Pagination
          totalItems={filteredList.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Manual Block Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)' }}>
            <form onSubmit={handleManualBlock}>
              <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(239,68,68,0.06)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Manual IP Quarantine</span>
                <button type="button" onClick={() => setModalOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Target IP Address</label>
                  <input type="text" value={manualIp} onChange={e => setManualIp(e.target.value)} placeholder="e.g. 192.168.1.50" required style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Reason / Note</label>
                  <input type="text" value={manualReason} onChange={e => setManualReason(e.target.value)} placeholder="Manual security ban" style={inputStyle} />
                </div>
              </div>
              <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium rounded" style={{ background: 'var(--danger)', color: '#fff' }}>Apply Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
