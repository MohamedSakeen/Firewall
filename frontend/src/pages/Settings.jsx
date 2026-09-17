import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
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
  }, []);

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      {/* Header (Checklist Section 10) */}
      <div>
        <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Settings</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">System administration, daemon connection, and engine parameters</p>
      </div>

      <div className="rounded p-4 max-w-2xl space-y-5" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        {/* Backend Connectivity */}
        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Backend Connectivity</div>
          <div className="flex items-center gap-2 mb-3">
            {apiStatus === 'online' ? (
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-healthy)' }}>
                <CheckCircle2 size={13} /> Flask API: ONLINE (http://localhost:5000)
              </span>
            ) : apiStatus === 'offline' ? (
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--status-threat)' }}>
                <AlertCircle size={13} /> Backend Unreachable — Start python api/api.py
              </span>
            ) : (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Testing connection...</span>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Backend API Base URL</label>
              <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Packet Sniffer Interface</label>
              <select style={inputStyle}>
                <option>Npcap Loopback / Default NIC (Windows)</option>
                <option>eth0</option>
                <option>wlan0</option>
                <option>any</option>
              </select>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div>
          <div className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)' }}>Environment & Engine</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Theme</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Locked to Security Console Dark</div>
              </div>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-healthy)' }} />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>WebSocket Real-Time</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Socket.IO streaming telemetry & events</div>
              </div>
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
