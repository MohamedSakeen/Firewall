import { useState, useEffect } from 'react';
import { Search, ChevronRight, ShieldBan, CheckCircle } from 'lucide-react';
import { fetchAlerts, blockIp } from '../services/api';
import { connectSocket } from '../services/socket';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

const severityStyle = (sev) => {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL': return { background: 'rgba(239,68,68,0.15)', color: 'var(--color-threat)' };
    case 'HIGH': return { background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' };
    case 'MEDIUM': return { background: 'rgba(245,158,11,0.10)', color: 'var(--color-warning)' };
    case 'LOW': return { background: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)' };
    default: return { background: 'rgba(107,114,128,0.15)', color: 'var(--text-secondary)' };
  }
};

export default function IDSAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [blockingStatus, setBlockingStatus] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const data = await fetchAlerts();
        if (mounted) setAlerts(data || []);
      } catch {
        console.warn('Failed to fetch alerts');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);

    const socket = connectSocket();
    socket.on('alert', (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      socket.off('alert');
    };
  }, []);

  const handleBlockIp = async () => {
    if (!selectedAlert || !selectedAlert.src_ip) return;
    setBlockingStatus(true);
    try {
      await blockIp(selectedAlert.src_ip, selectedAlert.attack || 'IDS Alert Block');
      setNotification({ type: 'success', message: `IP ${selectedAlert.src_ip} successfully quarantined` });
    } catch {
      setNotification({ type: 'error', message: 'Failed to block IP' });
    } finally {
      setBlockingStatus(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const filteredAlerts = alerts.filter(a =>
    a.src_ip?.includes(search) ||
    a.attack?.toLowerCase().includes(search.toLowerCase()) ||
    a.severity?.toLowerCase().includes(search.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const pagedAlerts = filteredAlerts.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Notification */}
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
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">IDS Alerts</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Signature and heuristic anomaly detection events</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search alerts..."
              className="text-xs rounded pl-7 pr-2 py-1 outline-none font-mono"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: 200 }}
            />
          </div>

          <ExportMenu
            filename="valaiaran-ids-alerts"
            data={filteredAlerts}
            currentPageData={pagedAlerts}
            columns={[
              { key: 'timestamp', label: 'Timestamp' },
              { key: 'src_ip', label: 'Source IP' },
              { key: 'attack', label: 'Signature' },
              { key: 'severity', label: 'Severity' },
              { key: 'score', label: 'Score' },
            ]}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Alert table */}
        <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="sticky top-0" style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)', zIndex: 1 }}>
                  {['Time', 'Alert ID', 'Severity', 'Source IP', 'Signature', 'Score'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={6}>Loading alerts...</td></tr>
                )}
                {!loading && filteredAlerts.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={6}>No alerts matching filter</td></tr>
                )}
                {pagedAlerts.map((alert, i) => {
                  const sev = severityStyle(alert.severity);
                  const isSelected = selectedAlert === alert;
                  const itemIndex = startIndex + i;
                  return (
                    <tr
                      key={itemIndex}
                      onClick={() => setSelectedAlert(alert)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--accent-muted)' : 'transparent',
                        borderLeft: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{alert.timestamp?.split(' ')[1]?.split('.')[0] || alert.timestamp}</td>
                      <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--color-primary)' }}>ALT-{String(itemIndex + 1).padStart(3, '0')}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={sev}>{alert.severity?.toUpperCase()}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--color-threat)' }}>{alert.src_ip}</td>
                      <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{alert.attack}</td>
                      <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--color-warning)' }}>{alert.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 50 records/page Pagination (Checklist Section 12) */}
          <Pagination
            totalItems={filteredAlerts.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Detail panel */}
        {selectedAlert && (
          <div
            className="shrink-0 overflow-y-auto flex flex-col rounded"
            style={{ width: 340, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="px-3 py-2 flex justify-between items-center sticky top-0" style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>Alert Details</span>
              <button onClick={() => setSelectedAlert(null)} className="p-0.5" style={{ color: 'var(--text-muted)' }}><ChevronRight size={16} /></button>
            </div>
            <div className="p-3 space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Matched Signature</span>
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={severityStyle(selectedAlert.severity)}>{selectedAlert.severity?.toUpperCase()}</span>
                </div>
                <div className="rounded p-2 text-sm font-medium" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-heading)' }}>{selectedAlert.attack}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider block mb-0.5" style={{ color: 'var(--text-muted)' }}>Source IP</span>
                  <div className="font-mono text-sm font-medium" style={{ color: 'var(--color-threat)' }}>{selectedAlert.src_ip}</div>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider block mb-0.5" style={{ color: 'var(--text-muted)' }}>Threat Score</span>
                  <div className="font-mono text-sm font-medium" style={{ color: 'var(--color-warning)' }}>{selectedAlert.score} / 100</div>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider block mb-0.5" style={{ color: 'var(--text-muted)' }}>Timestamp</span>
                  <div className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedAlert.timestamp}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <button
                  onClick={handleBlockIp}
                  disabled={blockingStatus}
                  className="w-full py-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  style={{ background: 'var(--danger)', color: '#fff', opacity: blockingStatus ? 0.6 : 1 }}
                >
                  <ShieldBan size={14} />
                  {blockingStatus ? 'Applying Block...' : 'Quarantine Source IP'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
