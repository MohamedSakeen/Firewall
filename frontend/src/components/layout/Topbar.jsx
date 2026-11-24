import { useState, useEffect } from 'react';
<<<<<<< HEAD
=======
import { Bell } from 'lucide-react';
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
import { fetchHealth } from '../../services/api';

export default function Topbar() {
  const [health, setHealth] = useState(null);
<<<<<<< HEAD
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
=======
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const data = await fetchHealth();
        setHealth(data);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
      }
    };

    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
<<<<<<< HEAD
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
=======
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: 44,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: isOnline ? 'var(--status-healthy)' : 'var(--status-threat)' }}
          />
          <span
            className="text-xs font-mono font-medium"
            style={{ color: isOnline ? 'var(--status-healthy)' : 'var(--status-threat)' }}
          >
            {isOnline ? 'ENGINE ONLINE' : 'DISCONNECTED'}
          </span>
        </div>

        {health && (
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Status: <span style={{ color: 'var(--text-primary)' }}>{health.overall_status}</span>
          </span>
        )}
      </div>
<<<<<<< HEAD
=======

      {/* Right: Notification */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="System Notifications"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Bell size={16} />
        </button>
      </div>
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955
    </header>
  );
}
