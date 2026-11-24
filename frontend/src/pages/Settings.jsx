import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
<<<<<<< HEAD
import { fetchHealth } from '../services/api';
import { connectSocket } from '../services/socket';

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [socketConnected, setSocketConnected] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchHealth();
        if (!mounted) return;
        setHealth(data);
        setApiStatus(data?.overall_status === 'UNHEALTHY' ? 'unhealthy' : 'online');
      } catch {
        if (mounted) setApiStatus('offline');
      }
    })();

    const socket = connectSocket();
    const syncSocket = () => setSocketConnected(socket.connected);
    socket.on('connect', syncSocket);
    socket.on('disconnect', syncSocket);
    const timer = setTimeout(syncSocket, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
      socket.off('connect', syncSocket);
      socket.off('disconnect', syncSocket);
    };
=======
import { fetchDashboardStats } from '../services/api';

export default function Settings() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [endpoint, setEndpoint] = useState('http://localhost:5000/api');

  useEffect(() => {
    (async () => {
      try {
        await fetchDashboardStats();
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      }
    })();
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
  }, []);

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '100%',
  };

<<<<<<< HEAD
  const statusColor = apiStatus === 'online' ? 'var(--status-healthy)' : apiStatus === 'checking' ? 'var(--text-muted)' : 'var(--status-threat)';

  return (
    <div className="space-y-4">
=======
  return (
    <div className="space-y-4">
      {/* Header (Checklist Section 10) */}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
      <div>
        <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Settings</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">System administration, daemon connection, and engine parameters</p>
      </div>

      <div className="rounded p-4 max-w-2xl space-y-5" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
<<<<<<< HEAD
=======
        {/* Backend Connectivity */}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Backend Connectivity</div>
          <div className="flex items-center gap-2 mb-3">
            {apiStatus === 'online' ? (
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-healthy)' }}>
<<<<<<< HEAD
                <CheckCircle2 size={13} /> API REACHABLE
              </span>
            ) : apiStatus === 'checking' ? (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Testing connection...</span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: statusColor }}>
                <AlertCircle size={13} /> {apiStatus === 'unhealthy' ? 'API REPORTED UNHEALTHY' : 'BACKEND UNREACHABLE'}
              </span>
            )}
            {health?.overall_status && (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Status: {health.overall_status}</span>
=======
                <CheckCircle2 size={13} /> Flask API: ONLINE (http://localhost:5000)
              </span>
            ) : apiStatus === 'offline' ? (
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-threat)' }}>
                <AlertCircle size={13} /> Backend Unreachable — Start python api/api.py
              </span>
            ) : (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Testing connection...</span>
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Backend API Base URL</label>
<<<<<<< HEAD
              <input type="text" value={API_ENDPOINT} readOnly style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Packet Sniffer Interface</label>
              <select disabled style={{ ...inputStyle, color: 'var(--text-muted)' }}>
                <option value="">Not available from API</option>
=======
              <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Packet Sniffer Interface</label>
              <select style={inputStyle}>
                <option>Npcap Loopback / Default NIC (Windows)</option>
                <option>eth0</option>
                <option>wlan0</option>
                <option>any</option>
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
              </select>
            </div>
          </div>
        </div>

<<<<<<< HEAD
=======
        {/* Environment */}
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Environment & Engine</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Theme</div>
<<<<<<< HEAD
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Not reported by API</div>
              </div>
=======
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Locked to Security Console Dark</div>
              </div>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-healthy)' }} />
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>WebSocket Real-Time</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Socket.IO streaming telemetry & events</div>
              </div>
<<<<<<< HEAD
              <span className="text-xs font-mono font-medium" style={{ color: socketConnected === null ? 'var(--text-muted)' : socketConnected ? 'var(--status-healthy)' : 'var(--status-threat)' }}>
                {socketConnected === null ? 'CONNECTING…' : socketConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Subsystem Health</div>
          {!health && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No health data available</div>}
          {health && Object.entries(health.subsystems || {}).length === 0 && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No subsystem data reported</div>
          )}
          {health && Object.entries(health.subsystems || {}).map(([name, info]) => (
            <div key={name} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{name}</span>
              <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{info?.status ?? '—'}</span>
            </div>
          ))}
        </div>
=======
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>ACTIVE</span>
            </div>
          </div>
        </div>
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
      </div>
    </div>
  );
}
