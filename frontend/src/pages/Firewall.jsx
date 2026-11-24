import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Search, X, Trash2 } from 'lucide-react';
import { fetchFirewallRules, addFirewallRule, deleteFirewallRule } from '../services/api';
import { selectIsViewer, selectRole } from '../store/slices/authSlice';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';
import RoleNotice from '../components/auth/RoleNotice';

const display = (value) => value === null || value === undefined || value === '' ? '—' : value;

const normalizeRules = (data) => {
  const entries = [];

  if (Array.isArray(data?.rules)) {
    data.rules.forEach((rule, idx) => {
      const src = rule.src ?? rule.source ?? rule.src_ip ?? '';
      const port = rule.port ?? rule.dst_port ?? '';
      entries.push({
        id: display(rule.id ?? rule.rule_id),
        type: display(rule.type ?? (src && port ? 'RULE' : src ? 'IP' : port ? 'PORT' : null)),
        value: display(rule.value ?? src ?? port),
        direction: display(rule.direction),
        protocol: display(rule.protocol),
        action: display(rule.action),
        active: typeof rule.active === 'boolean' ? rule.active : typeof rule.enabled === 'boolean' ? rule.enabled : null,
        deletePayload: { src: src || undefined, port: port !== '' ? String(port) : undefined },
        key: rule.id ?? rule.rule_id ?? `rule-${idx}`,
      });
    });
  }

  (data?.blocked_ips || []).forEach((ip, idx) => {
    entries.push({
      id: '—', type: 'IP', value: display(ip), direction: '—', protocol: '—', action: '—', active: null,
      deletePayload: { src: ip }, key: `ip-${idx}-${ip}`,
    });
  });

  (data?.blocked_ports || []).forEach((port, idx) => {
    entries.push({
      id: '—', type: 'PORT', value: display(port), direction: '—', protocol: '—', action: '—', active: null,
      deletePayload: { port: String(port) }, key: `port-${idx}-${port}`,
    });
  });

  return entries;
};

export default function Firewall() {
  const role = useSelector(selectRole);
  const isViewer = useSelector(selectIsViewer);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newRule, setNewRule] = useState({ src: '', port: '' });
  const pageSize = 50;

  const loadRules = useCallback(async () => {
    try {
      const data = await fetchFirewallRules();
      setRules(normalizeRules(data));
      setError(null);
    } catch {
      setError('Unable to load firewall rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadRules, 0);
    return () => clearTimeout(timer);
  }, [loadRules]);

  const handleAddRule = async (e) => {
    e.preventDefault();
    const src = newRule.src.trim();
    const port = newRule.port.trim();
    if (!src && !port) return;
    const payload = {};
    if (src) payload.src = src;
    if (port) payload.port = port;
    try {
      await addFirewallRule(payload);
      setModalOpen(false);
      setNewRule({ src: '', port: '' });
      setError(null);
      await loadRules();
    } catch {
      setError('Unable to add firewall rule');
    }
  };

  const handleDeleteRule = async (rule) => {
    try {
      await deleteFirewallRule(rule.deletePayload);
      setError(null);
      await loadRules();
    } catch {
      setError('Unable to delete firewall rule');
    }
  };

  const handleFilterChange = (val) => {
    setFilterText(val);
    setCurrentPage(1);
  };

  const filteredRules = rules.filter(r =>
    [r.type, r.value, r.direction, r.protocol, r.action].some(v => v?.toLowerCase().includes(filterText.toLowerCase()))
  );

  const startIndex = (currentPage - 1) * pageSize;
  const pagedRules = filteredRules.slice(startIndex, startIndex + pageSize);

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '100%',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Firewall Rules</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Blocked addresses and port restrictions reported by the firewall</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename="valaiaran-firewall-rules"
            data={filteredRules}
            currentPageData={pagedRules}
            columns={[
              { key: 'id', label: 'Rule ID' },
              { key: 'type', label: 'Type' },
              { key: 'value', label: 'Value' },
              { key: 'direction', label: 'Direction' },
              { key: 'protocol', label: 'Protocol' },
              { key: 'action', label: 'Action' },
              { key: 'active', label: 'Status' },
            ]}
          />
          {!isViewer && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <Plus size={14} /> Add Rule
            </button>
          )}
        </div>
      </div>

      <RoleNotice role={role} />

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={filterText}
              onChange={e => handleFilterChange(e.target.value)}
              placeholder="Filter rules..."
              className="text-xs rounded pl-7 pr-2 py-1 outline-none font-mono"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: 200 }}
            />
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">{filteredRules.length} rules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['ID', 'Type', 'Value', 'Direction', 'Protocol', 'Action', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              {loading && (
                <tr><td className="px-3 py-6 text-center text-sm font-sans text-[var(--text-muted)]" colSpan={8}>Loading...</td></tr>
              )}
              {!loading && filteredRules.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-sm font-sans text-[var(--text-muted)]" colSpan={8}>No firewall rules configured</td></tr>
              )}
              {pagedRules.map(rule => (
                <tr key={rule.key} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2 text-xs text-[var(--text-muted)]">{rule.id}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-primary)' }}>{rule.type}</td>
                  <td className="px-3 py-2 text-xs text-[var(--text-primary)]">{rule.value}</td>
                  <td className="px-3 py-2 text-xs">{rule.direction}</td>
                  <td className="px-3 py-2 text-xs">{rule.protocol}</td>
                  <td className="px-3 py-2 text-xs">{rule.action}</td>
                  <td className="px-3 py-2 text-[11px]" style={{ color: rule.active === null ? 'var(--text-muted)' : rule.active ? 'var(--color-success)' : 'var(--color-threat)' }}>
                    {rule.active === null ? '—' : rule.active ? 'ACTIVE' : 'INACTIVE'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!isViewer && (
                      <button
                        onClick={() => handleDeleteRule(rule)}
                        title="Delete rule"
                        className="p-1 rounded transition-colors text-[var(--text-muted)] hover:text-[var(--color-threat)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          totalItems={filteredRules.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {modalOpen && !isViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)' }}>
            <form onSubmit={handleAddRule}>
              <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}>
                <span className="text-sm font-semibold text-[var(--text-heading)]">Add Firewall Rule</span>
                <button type="button" onClick={() => setModalOpen(false)} className="text-[var(--text-muted)]"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-[var(--text-muted)]">Source IP / CIDR to Block</label>
                  <input type="text" value={newRule.src} onChange={e => setNewRule({ ...newRule, src: e.target.value })} placeholder="IP address or CIDR" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-[var(--text-muted)]">Port to Block</label>
                  <input type="number" min="1" max="65535" value={newRule.port} onChange={e => setNewRule({ ...newRule, port: e.target.value })} placeholder="Port" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Provide at least one value. Unsupported rule fields are not displayed.</div>
              </div>
              <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded transition-colors text-[var(--text-secondary)]">Cancel</button>
                <button type="submit" disabled={!newRule.src.trim() && !newRule.port.trim()} className="px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50" style={{ background: 'var(--color-primary)', color: '#fff' }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
