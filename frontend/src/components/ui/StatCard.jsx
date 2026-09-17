export default function StatCard({ title, value, subtitle, status }) {
  const statusColor = status === 'danger' ? 'var(--status-threat)'
    : status === 'warning' ? 'var(--status-warning)'
    : status === 'healthy' ? 'var(--status-healthy)'
    : 'var(--text-heading)';

  return (
    <div
      className="rounded px-3 py-2.5"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        {title}
      </div>
      <div className="text-lg font-semibold font-mono" style={{ color: statusColor }}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
