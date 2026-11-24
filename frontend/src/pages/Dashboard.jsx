import { useState, useEffect, useCallback } from 'react';
import StatCard from '../components/ui/StatCard';
import ExportMenu from '../components/ui/ExportMenu';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchDashboardStats, fetchRecentAlerts, fetchTrafficSummary, fetchHealth } from '../services/api';
import { connectSocket } from '../services/socket';

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

const severityStyle = (sev) => {
  switch (sev?.toLowerCase()) {
    case 'critical': return { background: 'rgba(239,68,68,0.15)', color: 'var(--color-threat)' };
    case 'high': return { background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' };
    case 'medium': return { background: 'rgba(245,158,11,0.10)', color: 'var(--color-warning)' };
    case 'low': return { background: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)' };
    default: return { background: 'rgba(107,114,128,0.15)', color: 'var(--text-secondary)' };
  }
};

const tooltipStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  fontSize: 12,
};

const metricValue = (value) => value === null || value === undefined || value === '' ? '—' : String(value).toLocaleString();

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [packetData, setPacketData] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [socketConnected, setSocketConnected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [statsData, recentData, summaryData, healthData] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentAlerts(),
        fetchTrafficSummary(),
        fetchHealth(),
      ]);
      setStats(statsData);
      setRecentAlerts(Array.isArray(recentData) ? recentData : []);
      setPacketData((summaryData?.bandwidthData || []).map(b => ({
        time: b.time,
        normal: b.rx,
        suspicious: b.tx,
      })));
      setHealthStatus(healthData?.overall_status ?? null);
      setError(null);
    } catch {
      setError('Unable to load dashboard telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(loadData, 0);
    const interval = setInterval(loadData, 10000);
    let refreshTimer = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(loadData, 500);
    };

    const socket = connectSocket();
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const socketTimer = setTimeout(() => setSocketConnected(socket.connected), 0);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('packet', scheduleRefresh);
    socket.on('alert', scheduleRefresh);
    socket.on('block', scheduleRefresh);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(socketTimer);
      clearInterval(interval);
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('packet', scheduleRefresh);
      socket.off('alert', scheduleRefresh);
      socket.off('block', scheduleRefresh);
    };
  }, [loadData]);

  const liveLabel = socketConnected === null && !healthStatus ? 'CONNECTING…'
    : socketConnected && healthStatus === 'HEALTHY' ? 'LIVE'
    : socketConnected ? 'STREAMING'
    : healthStatus ? healthStatus
    : 'OFFLINE';
  const liveColor = liveLabel === 'LIVE' || liveLabel === 'STREAMING' || liveLabel === 'HEALTHY'
    ? 'var(--color-success)'
    : liveLabel === 'OFFLINE' || liveLabel === 'UNHEALTHY' ? 'var(--color-threat)' : 'var(--color-warning)';

  const sortedAlerts = [...recentAlerts]
    .sort((a, b) => String(b.timestamp || b.event_time || '').localeCompare(String(a.timestamp || a.event_time || '')))
    .slice(0, 10);
  const threatData = stats?.threatDistribution || [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Overview</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">High-level operational overview, threat status, and telemetry</p>
        </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Overview</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">High-level operational overview, threat status, and telemetry</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: liveColor }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: liveColor }} />
          {liveLabel}
        </div>
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Packets Observed" value={metricValue(stats?.totalPackets)} subtitle="Since process start" />
        <StatCard title="Threats Blocked" value={metricValue(stats?.threatsBlocked)} subtitle="IPS interventions" />
        <StatCard title="IDS Alerts" value={metricValue(stats?.idsAlerts)} subtitle={stats?.criticalAlerts === null || stats?.criticalAlerts === undefined ? '—' : `${metricValue(stats.criticalAlerts)} Critical`} status={stats?.criticalAlerts > 0 ? 'danger' : undefined} />
        <StatCard title="Active Rules" value={metricValue(stats?.activeRules)} subtitle="Firewall + IDS" />
        <StatCard title="Uptime" value={metricValue(stats?.uptime)} subtitle="Session uptime" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded p-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Traffic Volume (RX / TX)
          </div>
          <div className="h-56 w-full">
            {packetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={packetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="normal" name="RX" stroke="#10B981" fill="rgba(16,185,129,0.08)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="suspicious" name="TX" stroke="#EF4444" fill="rgba(239,68,68,0.08)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>No bandwidth samples available</div>
            )}
          </div>
        </div>

        <div className="rounded p-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Threat Distribution
          </div>
          <div className="h-56 w-full">
            {threatData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={threatData} cx="50%" cy="45%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {threatData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>No threat distribution available</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Recent Threat Alerts</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[var(--text-muted)]">{recentAlerts.length} events</span>
            <ExportMenu
              filename="valaiaran-overview-alerts"
              data={recentAlerts}
              columns={[
                { key: 'timestamp', label: 'Timestamp' },
                { key: 'src_ip', label: 'Source IP' },
                { key: 'attack', label: 'Threat Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'action', label: 'Action' },
              ]}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Source IP</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Threat Type</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Severity</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAlerts.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-[var(--text-muted)]" colSpan={5}>No alerts recorded</td>
                </tr>
              )}
              {sortedAlerts.map((alert, i) => (
                <tr
                  key={alert.alert_id || `${alert.timestamp || ''}-${i}`}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: alert.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = alert.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent'; }}
                >
                  <td className="px-3 py-2 font-mono text-xs text-[var(--text-muted)]">{alert.timestamp ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--color-threat)' }}>{alert.src_ip ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-[var(--text-primary)]">{alert.attack ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={severityStyle(alert.severity)}>
                      {alert.severity ? String(alert.severity).toUpperCase() : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono font-medium" style={{ color: alert.action === 'BLOCK' ? 'var(--color-threat)' : 'var(--text-secondary)' }}>
                    {alert.action ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
