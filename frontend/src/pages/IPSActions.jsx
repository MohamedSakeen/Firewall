import { useState, useEffect, useCallback } from 'react';
import { Clock, Unlock, Plus, X, CheckCircle, Search } from 'lucide-react';
import { fetchBlocked, unblockIp, blockIp } from '../services/api';
import { connectSocket } from '../services/socket';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

const parseStartTime = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return new Date(value * 1000);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const banExpiry = (ban) => {
  if (ban.expires_at || ban.expiry || ban.expires) return ban.expires_at || ban.expiry || ban.expires;
  const duration = ban.duration;
  if (typeof duration === 'string' && duration !== '') return duration;
  const seconds = Number(duration);
  const start = parseStartTime(ban.start_time ?? ban.blocked_at ?? ban.blockedAt ?? ban.timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0 || !start) return '—';
  return new Date(start.getTime() + seconds * 1000).toISOString();
};

export default function IPSActions() {
  const [blockList, setBlockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [notification, setNotification] = useState(null);

  const loadBlocked = useCallback(async () => {
    try {
      const data = await fetchBlocked();
      setBlockList(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Unable to load blocked IPs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(loadBlocked, 0);
    const interval = setInterval(loadBlocked, 10000);
    const socket = connectSocket();
    const onBlock = () => { loadBlocked(); };
    socket.on('block', onBlock);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      socket.off('block', onBlock);
    };
  }, [loadBlocked]);

  const handleUnblock = async (ip) => {
    try {
      await unblockIp({ ip });
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
    if (!manualIp.trim() || !manualReason.trim() || !manualDuration.trim()) return;
    try {
      await blockIp({ ip: manualIp.trim(), reason: manualReason.trim(), duration: Number(manualDuration) });
      setManualIp('');
      setManualReason('');
      setManualDuration('');
      setModalOpen(false);
      await loadBlocked();
      setNotification({ type: 'success', message: `Block applied to ${manualIp.trim()}.` });
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
      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">IPS Actions</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Active IP quarantine, ban enforcement, and threat mitigation</p>
        </div>
        <div className="flex items-center gap-3">
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
            disabled={filteredList.length === 0}
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
                  key={b.ip ?? `ban-${startIndex + i}`}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--color-threat)' }}>{b.ip ?? '—'}</td>
                  <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{b.reason ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{b.blockedAt ?? b.blocked_at ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center text-xs font-mono gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={11} style={{ color: 'var(--color-primary)' }} /> {banExpiry(b)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleUnblock(b.ip)}
                      disabled={!b.ip}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-50"
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

        <Pagination
          totalItems={filteredList.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

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
                  <input type="text" value={manualIp} onChange={e => setManualIp(e.target.value)} placeholder="IP address" required style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Reason / Note</label>
                  <input type="text" value={manualReason} onChange={e => setManualReason(e.target.value)} placeholder="Enter reason" required style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Duration (seconds)</label>
                  <input type="number" min="1" value={manualDuration} onChange={e => setManualDuration(e.target.value)} placeholder="Enter duration" required style={inputStyle} />
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
