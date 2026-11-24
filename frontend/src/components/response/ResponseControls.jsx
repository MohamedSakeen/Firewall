import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  fetchAutonomyStatus,
  resetKillSwitch,
  rollbackAction,
  setAutonomyLevel,
  triggerKillSwitch,
} from '../../services/api';
import { selectIsAdmin } from '../../store/slices/authSlice';

const AUTONOMY_LEVELS = [
  'LEVEL_0_OBSERVE',
  'LEVEL_1_RECOMMEND',
  'LEVEL_2_SHADOW',
  'LEVEL_3_CONTROLLED_AUTO',
  'LEVEL_4_ADAPTIVE_DEFENSE',
];
const ACTION_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

const inputStyle = {
  background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
  borderRadius: 'var(--radius)', fontSize: '12px', padding: '5px 8px', outline: 'none', width: '100%',
};

export default function ResponseControls({ onChanged }) {
  const isAdmin = useSelector(selectIsAdmin);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [level, setLevel] = useState('');
  const [killReason, setKillReason] = useState('');
  const [rollback, setRollback] = useState({ action_id: '', reason: '' });
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const mountedRef = useRef(false);
  const noticeTimerRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchAutonomyStatus();
      if (mountedRef.current) {
        setStatus(data ?? null);
        setStatusError(null);
      }
      return data ?? null;
    } catch {
      if (mountedRef.current) setStatusError('Unable to load autonomy status.');
      return null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    (async () => {
      const data = await loadStatus();
      if (active && data?.current_level) setLevel(data.current_level);
    })();
    return () => {
      active = false;
      mountedRef.current = false;
      clearTimeout(noticeTimerRef.current);
    };
  }, [loadStatus]);

  const showNotice = (type, message) => {
    clearTimeout(noticeTimerRef.current);
    setNotice({ type, message });
    noticeTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setNotice(null);
    }, 4000);
  };

  const runAction = async (key, action, successMessage, errorMessage) => {
    setBusy(key);
    try {
      await action();
      if (!mountedRef.current) return false;
      showNotice('success', successMessage);
      const updated = await loadStatus();
      if (updated?.current_level) setLevel(updated.current_level);
      onChanged?.();
      return true;
    } catch {
      if (mountedRef.current) showNotice('error', errorMessage);
      return false;
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  const handleLevel = (event) => {
    event.preventDefault();
    if (!level || busy) return;
    runAction(
      'level',
      () => setAutonomyLevel({ level }),
      `Autonomy level set to ${level}.`,
      'Autonomy level could not be changed.',
    );
  };

  const handleKillSwitch = async (decision) => {
    const reason = killReason.trim();
    if (!reason || busy) return;
    const succeeded = await runAction(
      decision,
      () => (decision === 'engage'
        ? triggerKillSwitch({ reason })
        : resetKillSwitch({ reason })),
      decision === 'engage' ? 'Kill switch engaged; automated enforcement is disabled.' : 'Kill switch reset.',
      decision === 'engage' ? 'Kill switch could not be engaged.' : 'Kill switch could not be reset.',
    );
    if (succeeded && mountedRef.current) setKillReason('');
  };

  const handleRollback = async (event) => {
    event.preventDefault();
    const actionId = rollback.action_id.trim();
    const reason = rollback.reason.trim();
    if (!ACTION_ID_PATTERN.test(actionId) || !reason || busy) return;
    const succeeded = await runAction(
      'rollback',
      () => rollbackAction({ action_id: actionId, reason }),
      `Rollback requested for ${actionId}.`,
      'Rollback could not be completed.',
    );
    if (succeeded && mountedRef.current) setRollback({ action_id: '', reason: '' });
  };

  const statusRows = [
    ['Current level', status?.current_level ?? '—'],
    ['Kill switch', status?.kill_switch_active ? 'ENGAGED' : 'INACTIVE'],
    ['Active rollback actions', status?.active_rollback_actions ?? 0],
  ];
  if (status?.kill_switch_reason) {
    statusRows.push(['Kill switch reason', status.kill_switch_reason]);
  }

  return (
    <div className="rounded p-4 space-y-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Autonomy &amp; Response Controls</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {isAdmin ? 'Administrative controls are enforced on the server.' : 'Read-only status; write controls require the admin role.'}
          </div>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={busy !== null}
          title="Refresh autonomy status"
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] rounded transition-colors disabled:opacity-50"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {notice && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded text-xs"
          style={{
            background: notice.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${notice.type === 'success' ? 'var(--color-success)' : 'var(--color-threat)'}`,
            color: notice.type === 'success' ? 'var(--color-success)' : 'var(--color-threat)',
          }}
        >
          {notice.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {notice.message}
        </div>
      )}
      {statusError && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {statusError}
        </div>
      )}
      {status?.kill_switch_active && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          Automated enforcement is currently disabled by the global kill switch.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {statusRows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className="text-[11px] font-mono" style={{ color: label === 'Kill switch' && status?.kill_switch_active ? 'var(--color-threat)' : 'var(--text-primary)' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <form onSubmit={handleLevel} className="space-y-2">
            <label className="block text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Autonomy level</label>
            <div className="flex gap-2">
              <select value={level} onChange={e => setLevel(e.target.value)} style={inputStyle} required>
                <option value="">Select level</option>
                {AUTONOMY_LEVELS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
              <button
                type="submit"
                disabled={!level || busy !== null}
                className="shrink-0 px-3 py-1.5 text-[11px] font-medium rounded transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Apply
              </button>
            </div>
          </form>

          <form onSubmit={(e) => { e.preventDefault(); handleKillSwitch(status?.kill_switch_active ? 'reset' : 'engage'); }} className="space-y-2">
            <label className="block text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Kill switch reason (required)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={killReason}
                onChange={e => setKillReason(e.target.value)}
                maxLength={200}
                placeholder="Reason for this change"
                style={inputStyle}
                required
              />
              <button
                type="submit"
                disabled={!killReason.trim() || busy !== null}
                className="shrink-0 px-3 py-1.5 text-[11px] font-medium rounded transition-colors disabled:opacity-50"
                style={{ background: status?.kill_switch_active ? 'var(--status-healthy)' : 'var(--danger)', color: '#fff' }}
              >
                {status?.kill_switch_active ? 'Reset' : 'Engage'}
              </button>
            </div>
          </form>

          <form onSubmit={handleRollback} className="lg:col-span-2 space-y-2">
            <label className="block text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Roll back a response action</label>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
              <input
                type="text"
                value={rollback.action_id}
                onChange={e => setRollback(prev => ({ ...prev, action_id: e.target.value }))}
                pattern="[A-Za-z0-9_.:-]{1,128}"
                maxLength={128}
                placeholder="Action ID"
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                required
              />
              <input
                type="text"
                value={rollback.reason}
                onChange={e => setRollback(prev => ({ ...prev, reason: e.target.value }))}
                maxLength={200}
                placeholder="Reason (required)"
                style={inputStyle}
                required
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="shrink-0 px-3 py-1.5 text-[11px] font-medium rounded transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
              >
                Roll back
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
