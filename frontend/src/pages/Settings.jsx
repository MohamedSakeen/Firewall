import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  fetchHealth, fetchOpsHealth, fetchOpsMetrics,
} from '../services/api';
import { connectSocket } from '../services/socket';
import { selectIsAdmin, selectRole } from '../store/slices/authSlice';
import RoleNotice from '../components/auth/RoleNotice';
import ResponseControls from '../components/response/ResponseControls';

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'Not configured';

const formatUptime = (seconds) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'YES' : 'NO';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};

const renderMetricRows = (values) => Object.entries(values || {}).map(([name, value]) => (
  <div key={name} className="flex items-center justify-between gap-3 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
    <span className="font-mono text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{name}</span>
    <span className="font-mono text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{displayValue(value)}</span>
  </div>
));

export default function Settings() {
  const role = useSelector(selectRole);
  const isAdmin = useSelector(selectIsAdmin);
  const [apiStatus, setApiStatus] = useState('checking');
  const [opsHealth, setOpsHealth] = useState(null);
  const [opsError, setOpsError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(false);

  const loadPublicHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      if (mountedRef.current) setApiStatus(data?.status === 'ok' ? 'online' : 'offline');
    } catch {
      if (mountedRef.current) setApiStatus('offline');
    }
  }, []);

  const loadOpsHealth = useCallback(async () => {
    try {
      const data = await fetchOpsHealth();
      if (mountedRef.current) {
        setOpsHealth(data ?? null);
        setOpsError(null);
      }
    } catch {
      if (mountedRef.current) setOpsError('Unable to load operational health. Check your session and try again.');
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await fetchOpsMetrics();
      if (mountedRef.current) {
        setMetrics(data ?? null);
        setMetricsError(null);
      }
    } catch {
      if (mountedRef.current) setMetricsError('Unable to load process metrics.');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPublicHealth(), loadOpsHealth(), loadMetrics()]);
    if (mountedRef.current) setRefreshing(false);
  }, [loadPublicHealth, loadOpsHealth, loadMetrics]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPublicHealth();
      loadOpsHealth();
      loadMetrics();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPublicHealth, loadOpsHealth, loadMetrics]);

  useEffect(() => {
    const socket = connectSocket();
    const syncSocket = () => {
      if (mountedRef.current) setSocketConnected(socket.connected);
    };
    socket.on('connect', syncSocket);
    socket.on('disconnect', syncSocket);
    const timer = setTimeout(syncSocket, 0);
    return () => {
      clearTimeout(timer);
      socket.off('connect', syncSocket);
      socket.off('disconnect', syncSocket);
    };
  }, []);

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '100%',
  };

  const healthRows = [
    ['Database', displayValue(opsHealth?.db_ok)],
    ['Schema version', displayValue(opsHealth?.schema_version)],
    ['Registered users', displayValue(opsHealth?.user_count)],
    ['Stored events', displayValue(opsHealth?.event_count)],
    ['Response actions', displayValue(opsHealth?.response_action_count)],
    ['Sniffer enabled', displayValue(opsHealth?.sniffer_enabled)],
    ['Response mode', displayValue(opsHealth?.response_mode)],
    ['Autonomy level', displayValue(opsHealth?.autonomy_level)],
    ['Kill switch', opsHealth?.kill_switch_active === true ? 'ENGAGED' : opsHealth?.kill_switch_active === false ? 'INACTIVE' : '—'],
    ['Last event', opsHealth?.last_event_timestamp || 'None recorded'],
    ['Process uptime', formatUptime(opsHealth?.uptime_seconds)],
    ['Recent errors', displayValue(opsHealth?.recent_error_count)],
  ];
  const healthWarnings = [];
  if (opsHealth?.db_ok === false) healthWarnings.push('Database check failed.');
  if (opsHealth?.kill_switch_active) healthWarnings.push('Kill switch is engaged; automated enforcement is disabled.');
  if ((opsHealth?.recent_error_count ?? 0) > 0) healthWarnings.push('The backend reported recent errors; see server logs.');

  return (
    <div className="space-y-4">
      <RoleNotice role={role} />

      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Settings</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">System administration, daemon connection, and engine parameters</p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded transition-colors disabled:opacity-50"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={12} /> Refresh all
        </button>
      </div>

      <div className="rounded p-4 max-w-3xl space-y-5" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Connection details come from the build environment. Operational data is reported by the backend; write controls are limited by your role.
        </div>

        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Backend Connectivity</div>
          <div className="flex items-center gap-2 mb-3">
            {apiStatus === 'online' ? (
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-healthy)' }}>
                <CheckCircle2 size={13} /> API REACHABLE
              </span>
            ) : apiStatus === 'checking' ? (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Testing connection...</span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-threat)' }}>
                <AlertCircle size={13} /> BACKEND UNREACHABLE
              </span>
            )}
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Public health check only — no subsystem data</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Backend API Base URL (environment)</label>
              <input type="text" value={API_ENDPOINT} readOnly style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Operational Health</div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Authenticated snapshot from the operations endpoint.</div>
          {opsError && (
            <div className="rounded px-3 py-2 mb-2 text-[11px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
              {opsError}
            </div>
          )}
          {!opsHealth && !opsError && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading operational health...</div>
          )}
          {healthWarnings.length > 0 && (
            <div className="rounded px-3 py-2 mb-2 text-[11px] space-y-0.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
              {healthWarnings.map(warning => <div key={warning}>{warning}</div>)}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {healthRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="text-[11px] font-mono truncate" style={{ color: 'var(--text-primary)' }} title={String(value)}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Process Metrics</div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
            Read-only counters and gauges. Metrics are process-local and reset when the backend process restarts.
          </div>
          {metricsError && (
            <div className="rounded px-3 py-2 mb-2 text-[11px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
              {metricsError}
            </div>
          )}
          {!metrics && !metricsError && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading metrics...</div>
          )}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Counters</div>
                {renderMetricRows(metrics.counters)}
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Gauges</div>
                {renderMetricRows(metrics.gauges)}
                <div className="text-[10px] font-medium uppercase tracking-wider mt-3 mb-1" style={{ color: 'var(--text-muted)' }}>HTTP responses by status class</div>
                {renderMetricRows(metrics.http_requests_by_status_class)}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Environment &amp; Engine</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Theme</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Not reported by API</div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>WebSocket Real-Time</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Socket.IO streaming telemetry &amp; events</div>
              </div>
              <span className="text-xs font-mono font-medium" style={{ color: socketConnected === null ? 'var(--text-muted)' : socketConnected ? 'var(--status-healthy)' : 'var(--status-threat)' }}>
                {socketConnected === null ? 'CONNECTING…' : socketConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {(isAdmin || role === 'operator') && <ResponseControls onChanged={loadOpsHealth} />}
    </div>
  );
}
