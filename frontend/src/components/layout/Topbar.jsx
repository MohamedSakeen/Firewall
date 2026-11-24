import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { fetchHealth } from '../../services/api';
import { logoutUser, selectRole, selectUser } from '../../store/slices/authSlice';

export default function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);
  const [health, setHealth] = useState(null);
  const [isOnline, setIsOnline] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const handleLogout = async () => {
    setLoggingOut(true);
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

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

      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.username}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                {role || '—'}
              </span>
            </div>
            {role === 'viewer' && (
              <span
                className="text-[10px] font-mono"
                title="View-only session: write controls are hidden here. Permissions are enforced on the server."
                style={{ color: 'var(--text-muted)' }}
              >
                VIEW ONLY · SERVER-ENFORCED
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={14} /> {loggingOut ? 'Signing out…' : 'Logout'}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
