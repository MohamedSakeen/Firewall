export default function RoleNotice({ role }) {
  if (role !== 'viewer') return null;

  return (
    <div
      role="note"
      className="rounded px-3 py-2 text-[11px]"
      style={{ background: 'var(--accent-muted)', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--text-secondary)' }}
    >
      View-only session — write controls are hidden here. Permissions are enforced on the server.
    </div>
  );
}
