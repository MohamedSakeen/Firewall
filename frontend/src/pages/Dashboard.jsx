import { useState, useEffect } from 'react';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchDashboardStats, fetchRecentAlerts, fetchTrafficSummary } from '../services/api';
import { connectSocket } from '../services/socket';

const COLORS = ['#eab308', '#ef4444', '#3b82f6', '#22c55e'];

const severityStyle = (sev) => {
  switch (sev?.toLowerCase()) {
    case 'critical': return { background: 'rgba(239,68,68,0.1)', color: '#f87171' };
    case 'high': return { background: 'rgba(245,158,11,0.1)', color: '#fbbf24' };
    case 'medium': return { background: 'rgba(234,179,8,0.1)', color: '#facc15' };
    case 'low': return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa' };
    default: return { background: 'rgba(107,114,128,0.1)', color: '#9ca3af' };
  }
};

const tooltipStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  fontSize: 12,
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [threatData, setThreatData] = useState([]);
  const [packetData, setPacketData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [statsData, recentData, summaryData] = await Promise.all([
          fetchDashboardStats(),
          fetchRecentAlerts(),
          fetchTrafficSummary(),
        ]);
        if (!mounted) return;
        setStats(statsData);
        setRecentAlerts(recentData);
        setThreatData(statsData.threatDistribution || []);

        if (summaryData.bandwidthData && summaryData.bandwidthData.length > 0) {
          const chartData = summaryData.bandwidthData.map(b => ({
            time: b.time,
            normal: b.rx,
            suspicious: b.tx,
          }));
          setPacketData(chartData);
        }
      } catch {
        console.warn('Dashboard fetch failed, using fallback');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    const socket = connectSocket();
    socket.on('packet', () => {
      setStats(prev => prev ? { ...prev, totalPackets: (prev.totalPackets || 0) + 1 } : prev);
    });
    socket.on('alert', (newAlert) => {
      setRecentAlerts(prev => [newAlert, ...prev].slice(0, 10));
      setStats(prev => prev ? {
        ...prev,
        idsAlerts: (prev.idsAlerts || 0) + 1,
        criticalAlerts: newAlert.severity === 'critical' ? (prev.criticalAlerts || 0) + 1 : (prev.criticalAlerts || 0),
      } : prev);
    });
    socket.on('block', () => {
      setStats(prev => prev ? { ...prev, threatsBlocked: (prev.threatsBlocked || 0) + 1 } : prev);
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      socket.off('packet');
      socket.off('alert');
      socket.off('block');
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Overview</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded px-3 py-2.5 animate-pulse" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
              <div className="h-3 rounded w-16 mb-2" style={{ background: 'var(--bg-elevated)' }} />
              <div className="h-5 rounded w-12" style={{ background: 'var(--bg-elevated)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Overview
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-healthy)' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-healthy)' }} />
          LIVE
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Packets (24h)" value={(stats?.totalPackets ?? 0).toLocaleString()} subtitle="From sniffer" />
        <StatCard title="Threats Blocked" value={(stats?.threatsBlocked ?? 0).toLocaleString()} subtitle="IPS interventions" status="healthy" />
        <StatCard title="IDS Alerts" value={(stats?.idsAlerts ?? 0).toLocaleString()} subtitle={`${stats?.criticalAlerts ?? 0} Critical`} status={(stats?.criticalAlerts ?? 0) > 0 ? 'danger' : undefined} />
        <StatCard title="Active Rules" value={(stats?.activeRules ?? 0).toLocaleString()} subtitle="Firewall + IDS" />
        <StatCard title="Uptime" value={stats?.uptime ?? "N/A"} subtitle="Engine v2.1.0" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded p-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Traffic Volume (RX / TX)
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={packetData.length > 0 ? packetData : [{ time: '00:00', normal: 0, suspicious: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="normal" name="RX" stroke="#3b82f6" fill="rgba(59,130,246,0.08)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="suspicious" name="TX" stroke="#ef4444" fill="rgba(239,68,68,0.08)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded p-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Threat Distribution
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatData.length > 0 ? threatData : [{ name: 'No Data', value: 1 }]}
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {threatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent alerts table */}
      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recent Alerts</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{recentAlerts.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Time</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Source IP</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Threat Type</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Severity</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={5}>No alerts recorded</td>
                </tr>
              )}
              {recentAlerts.slice(-6).map((alert, i) => {
                const sev = severityStyle(alert.severity);
                return (
                  <tr
                    key={i}
                    className="transition-colors"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: alert.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = alert.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent'; }}
                  >
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{alert.timestamp}</td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--status-threat)' }}>{alert.src_ip}</td>
                    <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{alert.attack}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm"
                        style={sev}
                      >
                        {alert.severity?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono font-medium" style={{ color: alert.score > 50 ? 'var(--status-threat)' : 'var(--text-secondary)' }}>
                      {alert.score > 50 ? 'BLOCKED' : 'ALERT'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
