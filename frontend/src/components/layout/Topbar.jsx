import { useState, useEffect } from 'react';
import { fetchHealth } from '../../services/api';

export default function Topbar() {
  const [health, setHealth] = useState(null);
  const [isOnline, setIsOnline] = useState(null);

  useEffect(() => {
    let mounted = true;
    const checkBackendHealth = async () => {
      try {
        const data = await fetchHealth();
        if (!mounted) return;
        setHealth(data);
        setIsOnline(true);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const color = isOnline === null ? 'var(--status-warning)' : isOnline ? 'var(--status-healthy)' : 'var(--status-threat)';

  return (
    <header
      className="flex items-center justify-between px-4 shrink-0"
      style={{ height: 44, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="text-xs font-mono font-medium" style={{ color }}>
            {isOnline === null ? 'CONNECTING…' : isOnline ? 'ENGINE ONLINE' : 'OFFLINE'}
          </span>
        </div>
        {health?.overall_status && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Status: <span style={{ color: 'var(--text-primary)' }}>{health.overall_status}</span>
          </span>
        )}
      </div>
    </header>
  );
}
