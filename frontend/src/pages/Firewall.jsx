import { useState, useEffect } from 'react';
import { Plus, Search, X, Trash2 } from 'lucide-react';
import { fetchFirewallRules, addFirewallRule, deleteFirewallRule } from '../services/api';

const actionStyle = (action) => {
  switch (action) {
    case 'ALLOW': return { background: 'rgba(34,197,94,0.1)', color: '#4ade80' };
    case 'DROP': return { background: 'rgba(239,68,68,0.1)', color: '#f87171' };
    default: return { background: 'rgba(234,179,8,0.1)', color: '#facc15' };
  }
};

export default function Firewall() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const [newRule, setNewRule] = useState({
    direction: 'IN', protocol: 'TCP', src: '', dst: 'ANY', port: '', action: 'DROP',
  });

  const loadRules = async () => {
    try {
      const data = await fetchFirewallRules();
      const transformed = [];
      (data.blocked_ips || []).forEach((ip, i) => {
        transformed.push({ id: i + 1, direction: 'IN', protocol: 'ANY', src: ip, dst: 'ANY', port: 'ANY', action: 'DROP', active: true });
      });
      (data.blocked_ports || []).forEach((port, i) => {
        transformed.push({ id: 100 + i + 1, direction: 'IN', protocol: 'TCP', src: 'ANY', dst: 'ANY', port: String(port), action: 'DENY', active: true });
      });
      setRules(transformed);
    } catch {
      console.warn('Failed to fetch firewall rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRules(); }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    try {
      await addFirewallRule(newRule);
      setModalOpen(false);
      setNewRule({ direction: 'IN', protocol: 'TCP', src: '', dst: 'ANY', port: '', action: 'DROP' });
      await loadRules();
    } catch (err) {
      console.error('Failed to add firewall rule:', err);
    }
  };

  const handleDeleteRule = async (rule) => {
    try {
      await deleteFirewallRule({ src: rule.src, port: rule.port });
      await loadRules();
    } catch (err) {
      console.error('Failed to delete firewall rule:', err);
    }
  };

  const filteredRules = rules.filter(r =>
    r.src?.toLowerCase().includes(filterText.toLowerCase()) ||
    r.port?.toLowerCase().includes(filterText.toLowerCase()) ||
    r.protocol?.toLowerCase().includes(filterText.toLowerCase()) ||
    r.action?.toLowerCase().includes(filterText.toLowerCase())
  );

  const inputStyle = {
    background: 'var(--bg-inset)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    padding: '6px 10px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Firewall Rules</div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
        >
          <Plus size={14} /> Add Rule
        </button>
      </div>

      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter rules..."
              className="text-xs rounded pl-7 pr-2 py-1"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', outline: 'none', width: 200 }}
            />
          </div>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{filteredRules.length} rules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['ID', 'Dir', 'Proto', 'Source', 'Dest', 'Port', 'Action', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && (
                <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={9}>Loading...</td></tr>
              )}
              {!loading && filteredRules.length === 0 && (
                <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={9}>No firewall rules configured</td></tr>
              )}
              {filteredRules.map(rule => (
                <tr
                  key={rule.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>#{rule.id}</td>
                  <td className="px-3 py-2 text-xs">{rule.direction}</td>
                  <td className="px-3 py-2 text-xs font-mono">{rule.protocol}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{rule.src}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{rule.dst}</td>
                  <td className="px-3 py-2 font-mono text-xs">{rule.port}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={actionStyle(rule.action)}>
                      {rule.action}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: rule.active ? 'var(--status-healthy)' : 'var(--text-muted)' }} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDeleteRule(rule)}
                      title="Delete rule"
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--status-threat)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)' }}>
            <form onSubmit={handleAddRule}>
              <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Add Firewall Rule</span>
                <button type="button" onClick={() => setModalOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Direction</label>
                    <select value={newRule.direction} onChange={e => setNewRule({ ...newRule, direction: e.target.value })} style={inputStyle}>
                      <option value="IN">IN</option>
                      <option value="OUT">OUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Protocol</label>
                    <select value={newRule.protocol} onChange={e => setNewRule({ ...newRule, protocol: e.target.value })} style={inputStyle}>
                      <option value="TCP">TCP</option>
                      <option value="UDP">UDP</option>
                      <option value="ICMP">ICMP</option>
                      <option value="ANY">ANY</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Source IP / CIDR</label>
                    <input type="text" value={newRule.src} onChange={e => setNewRule({ ...newRule, src: e.target.value })} placeholder="e.g. 192.168.1.100" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Destination IP / CIDR</label>
                    <input type="text" value={newRule.dst} onChange={e => setNewRule({ ...newRule, dst: e.target.value })} placeholder="e.g. ANY" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Target Port(s)</label>
                  <input type="text" value={newRule.port} onChange={e => setNewRule({ ...newRule, port: e.target.value })} placeholder="e.g. 80, 443" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Action</label>
                  <select value={newRule.action} onChange={e => setNewRule({ ...newRule, action: e.target.value })} style={inputStyle}>
                    <option value="DROP">DROP</option>
                    <option value="DENY">DENY</option>
                    <option value="ALLOW">ALLOW</option>
                  </select>
                </div>
              </div>
              <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded transition-colors" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--accent)', color: '#fff' }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
