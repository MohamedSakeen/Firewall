import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { approvePendingAction, fetchApprovals, rejectPendingAction } from '../../services/api';

const cellStyle = { color: 'var(--text-secondary)' };

export default function PendingApprovals({ isAdmin = false }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [reasons, setReasons] = useState({});
  const [busyId, setBusyId] = useState(null);
  const mountedRef = useRef(false);
  const noticeTimerRef = useRef(null);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApprovals();
      if (!mountedRef.current) return;
      setApprovals(Array.isArray(data?.approvals) ? data.approvals : []);
      setError(null);
    } catch {
      if (mountedRef.current) setError('Unable to load pending approvals.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;
    mountedRef.current = true;
    const initialTimer = setTimeout(loadApprovals, 0);
    const interval = setInterval(loadApprovals, 30000);
    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      clearTimeout(noticeTimerRef.current);
    };
  }, [isAdmin, loadApprovals]);

  const showNotice = (type, message) => {
    clearTimeout(noticeTimerRef.current);
    setNotice({ type, message });
    noticeTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setNotice(null);
    }, 4000);
  };

  const decide = async (item, decision) => {
    const actionId = item?.action_id;
    if (!actionId || busyId) return;
    setBusyId(actionId);
    const reason = (reasons[actionId] || '').trim();
    try {
      const result = decision === 'approve'
        ? await approvePendingAction(actionId, reason)
        : await rejectPendingAction(actionId, reason);
      if (!mountedRef.current) return;
      const approvedOk = result?.status === 'ENFORCED';
      const rejectedOk = result?.status === 'REJECTED' || result?.status === 'SUCCESS';
      if ((decision === 'approve' && approvedOk) || (decision === 'reject' && rejectedOk)) {
        showNotice('success', decision === 'approve'
          ? `Action ${actionId} approved and enforced.`
          : `Action ${actionId} rejected.`);
        setReasons(prev => ({ ...prev, [actionId]: '' }));
      } else {
        showNotice('error', decision === 'approve'
          ? 'Approval was recorded but enforcement did not complete; see server logs.'
          : 'Rejection could not be recorded.');
      }
      await loadApprovals();
    } catch {
      if (mountedRef.current) {
        showNotice('error', decision === 'approve'
          ? 'Approval could not be applied. It may already be resolved.'
          : 'Rejection could not be recorded. It may already be resolved.');
        await loadApprovals();
      }
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  };

  return (
    <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>Pending Approval Requests</span>
        {isAdmin && (
          <button
            type="button"
            onClick={loadApprovals}
            disabled={loading}
            title="Refresh pending approvals"
            className="flex items-center gap-1 text-[11px] rounded px-2 py-1 disabled:opacity-50"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={11} /> Refresh
          </button>
        )}
      </div>

      {notice && (
        <div
          className="flex items-center gap-2 px-3 py-2 text-[11px]"
          style={{
            background: notice.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: notice.type === 'success' ? 'var(--color-success)' : 'var(--color-threat)',
          }}
        >
          {notice.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {notice.message}
        </div>
      )}
      {error && (
        <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-threat)' }}>{error}</div>
      )}

      {!isAdmin ? (
        <div className="px-3 py-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Pending approvals are available to administrators only.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Action ID', 'IP', 'Requested Action', 'Severity', 'Reason', 'Status', 'Decision Reason', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs">
              {loading && (
                <tr><td className="px-3 py-5 text-center" colSpan={8} style={{ color: 'var(--text-muted)' }}>Loading pending approvals...</td></tr>
              )}
              {!loading && approvals.length === 0 && (
                <tr><td className="px-3 py-5 text-center" colSpan={8} style={{ color: 'var(--text-muted)' }}>No actions awaiting approval</td></tr>
              )}
              {!loading && approvals.map(item => (
                <tr key={item.action_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--color-primary)' }}>{item.action_id ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--color-threat)' }}>{item.ip ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px]" style={cellStyle}>{item.action ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px]" style={cellStyle}>{item.severity ?? '—'}</td>
                  <td className="px-3 py-2 max-w-[260px] truncate" style={cellStyle} title={item.reason ?? ''}>{item.reason ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px]" style={cellStyle}>{item.status ?? 'PENDING_APPROVAL'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={reasons[item.action_id] || ''}
                      onChange={e => setReasons(prev => ({ ...prev, [item.action_id]: e.target.value }))}
                      maxLength={200}
                      placeholder="Optional (max 200)"
                      className="text-[11px] rounded px-2 py-1 outline-none"
                      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: 170 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => decide(item, 'approve')}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded mr-1.5 transition-colors disabled:opacity-50"
                      style={{ background: 'var(--status-healthy)', color: '#fff' }}
                    >
                      <Check size={11} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(item, 'reject')}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors disabled:opacity-50"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}
                    >
                      <X size={11} /> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
