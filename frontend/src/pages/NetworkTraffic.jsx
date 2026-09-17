import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/ui/StatCard';
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
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Traffic</div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Traffic</div>
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-healthy)' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-healthy)' }} />
          MONITORING
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="RX Packets" value={(summary?.rxCount ?? 0).toLocaleString()} subtitle="Received" status="healthy" />
        <StatCard title="TX Packets" value={(summary?.txCount ?? 0).toLocaleString()} subtitle="Sent" />
        <StatCard title="Active Connections" value={(summary?.activeConnections?.length ?? 0).toLocaleString()} subtitle="Recent sessions" />
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
              <Area type="monotone" dataKey="rx" name="RX" stroke="#22c55e" fill="rgba(34,197,94,0.08)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="tx" name="TX" stroke="#3b82f6" fill="rgba(59,130,246,0.08)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Connections</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{summary?.activeConnections?.length ?? 0} sessions</span>
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
              {(summary?.activeConnections ?? []).length === 0 && (
                <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={4}>No active connections</td></tr>
              )}
              {(summary?.activeConnections ?? []).map(c => (
                <tr
                  key={c.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2" style={{ color: 'var(--status-info)' }}>{c.src}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{c.dst}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: c.state === 'ESTABLISHED' ? 'rgba(34,197,94,0.1)' : 'var(--bg-elevated)',
                        color: c.state === 'ESTABLISHED' ? 'var(--status-healthy)' : 'var(--text-muted)',
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
      </div>
    </div>
  );
}
