import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { fetchResponseActions } from '../../services/api';

const ACTION_LIMIT = 100;

export default function ResponseActionLog() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  const loadActions = useCallback(async () => {
    try {
      const data = await fetchResponseActions(ACTION_LIMIT);
      if (!mountedRef.current) return;
      setActions(Array.isArray(data?.actions) ? data.actions : []);
      setError(null);
    } catch {
      if (mountedRef.current) setError('Unable to load the response action log.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initialTimer = setTimeout(loadActions, 0);
    const interval = setInterval(loadActions, 30000);
    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [loadActions]);

  return (
    <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
          Response Action Log ({actions.length})
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Most recent {ACTION_LIMIT} durable rows · read-only</span>
          <button
            type="button"
            onClick={loadActions}
            disabled={loading}
            title="Refresh response actions"
            className="flex items-center gap-1 text-[11px] rounded px-2 py-1 disabled:opacity-50"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 text-[11px]" style={{ color: 'var(--color-threat)' }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Timestamp', 'Actor', 'Action', 'IP', 'Status', 'Reason / Mode'].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs">
            {loading && (
              <tr><td className="px-3 py-5 text-center" colSpan={6} style={{ color: 'var(--text-muted)' }}>Loading response actions...</td></tr>
            )}
            {!loading && actions.length === 0 && (
              <tr><td className="px-3 py-5 text-center" colSpan={6} style={{ color: 'var(--text-muted)' }}>No response actions recorded</td></tr>
            )}
            {!loading && actions.map(row => (
              <tr key={row.action_id ?? row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{row.timestamp ?? '—'}</td>
                <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{row.actor ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>{row.action ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--color-threat)' }}>{row.ip ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{row.status ?? '—'}</td>
                <td className="px-3 py-2 text-[11px] max-w-[320px] truncate" style={{ color: 'var(--text-secondary)' }} title={`${row.reason ?? ''} (${row.mode ?? '—'})`}>
                  {row.reason || '—'} <span style={{ color: 'var(--text-muted)' }}>/ {row.mode ?? '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
