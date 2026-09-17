import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';
import { fetchTrafficSummary } from '../services/api';
import { connectSocket } from '../services/socket';

const tooltipStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  fontSize: 12,
};

export default function NetworkTraffic() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const data = await fetchTrafficSummary();
        if (mounted) setSummary(data);
      } catch {
        console.warn('Failed to fetch traffic summary');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    const socket = connectSocket();
    socket.on('packet', (pkt) => {
      setSummary(prev => {
        if (!prev) return prev;
        const isRx = pkt.src?.startsWith('10.');
        return {
          ...prev,
          totalPackets: (prev.totalPackets || 0) + 1,
          rxCount: isRx ? (prev.rxCount || 0) + 1 : (prev.rxCount || 0),
          txCount: !isRx ? (prev.txCount || 0) + 1 : (prev.txCount || 0),
        };
      });
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      socket.off('packet');
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Traffic</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Real-time packet counters, throughput volume, and session flows</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded px-3 py-2.5 animate-pulse" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
              <div className="h-3 rounded w-16 mb-2" style={{ background: 'var(--bg-elevated)' }} />
              <div className="h-5 rounded w-12" style={{ background: 'var(--bg-elevated)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const bandwidthData = summary?.bandwidthData || [];
  const activeConnections = summary?.activeConnections || [];

  const filteredConnections = activeConnections.filter(c =>
    !search || c.src?.includes(search) || c.dst?.includes(search) || c.state?.toLowerCase().includes(search.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const pagedConnections = filteredConnections.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Header (Checklist Section 10) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Traffic</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Real-time packet counters, throughput volume, and session flows</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--color-success)' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
          MONITORING
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="RX Packets" value={(summary?.rxCount ?? 0).toLocaleString()} subtitle="Received" status="healthy" />
        <StatCard title="TX Packets" value={(summary?.txCount ?? 0).toLocaleString()} subtitle="Sent" />
        <StatCard title="Active Connections" value={(activeConnections.length).toLocaleString()} subtitle="Recent sessions" />
        <StatCard title="Total Packets (24h)" value={(summary?.totalPackets ?? 0).toLocaleString()} subtitle="In & Out" />
      </div>

      <div className="rounded p-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Bandwidth Usage (packets/min)
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bandwidthData.length > 0 ? bandwidthData : [{ time: '00:00', rx: 0, tx: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="rx" name="RX" stroke="#10B981" fill="rgba(16,185,129,0.08)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="tx" name="TX" stroke="#3B82F6" fill="rgba(59,130,246,0.08)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Connections Table */}
      <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Connections</span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">{filteredConnections.length} sessions</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Filter sessions..."
                className="text-xs rounded pl-7 pr-2 py-1 outline-none font-mono"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: 160 }}
              />
            </div>

            <ExportMenu
              filename="valaiaran-active-connections"
              data={filteredConnections}
              currentPageData={pagedConnections}
              columns={[
                { key: 'src', label: 'Source' },
                { key: 'dst', label: 'Destination' },
                { key: 'state', label: 'State' },
                { key: 'bytes', label: 'Bytes' },
              ]}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Source</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Destination</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>State</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Data</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {filteredConnections.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={4}>No active connections</td></tr>
              )}
              {pagedConnections.map(c => (
                <tr
                  key={c.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2" style={{ color: 'var(--color-primary)' }}>{c.src}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{c.dst}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]"
                      style={{
                        background: c.state === 'ESTABLISHED' ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
                        color: c.state === 'ESTABLISHED' ? 'var(--color-success)' : 'var(--text-muted)',
                      }}
                    >
                      {c.state}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{c.bytes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 50 records/page Pagination (Checklist Section 12) */}
        <Pagination
          totalItems={filteredConnections.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
