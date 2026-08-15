import { useState, useEffect } from 'react';
import { Plus, Search, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFirewallRules, addFirewallRule, deleteFirewallRule } from '../services/api';

export default function Firewall() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  
  const [newRule, setNewRule] = useState({
    direction: 'IN',
    protocol: 'TCP',
    src: '',
    dst: 'ANY',
    port: '',
    action: 'DROP'
  });

  const loadRules = async () => {
    try {
      const data = await fetchFirewallRules();
      const transformed = [];
      (data.blocked_ips || []).forEach((ip, i) => {
        transformed.push({
          id: i + 1,
          direction: 'IN',
          protocol: 'ANY',
          src: ip,
          dst: 'ANY',
          port: 'ANY',
          action: 'DROP',
          active: true,
        });
      });
      (data.blocked_ports || []).forEach((port, i) => {
        transformed.push({
          id: 100 + i + 1,
          direction: 'IN',
          protocol: 'TCP',
          src: 'ANY',
          dst: 'ANY',
          port: String(port),
          action: 'DENY',
          active: true,
        });
      });
      setRules(transformed);
    } catch {
      console.warn('Failed to fetch firewall rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Firewall Rules</h1>
        <button onClick={() => setModalOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors">
          <Plus size={16} className="mr-2" /> Add Rule
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter rules..." 
              className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-64" 
            />
          </div>
          <span className="text-xs text-gray-500">{filteredRules.length} rules loaded</span>
        </div>
        
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Direction</th>
              <th className="px-5 py-3">Protocol</th>
              <th className="px-5 py-3">Source IP/CIDR</th>
              <th className="px-5 py-3">Dest IP/CIDR</th>
              <th className="px-5 py-3">Port</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-5 py-8 text-center text-gray-600" colSpan={9}>Loading...</td></tr>
            )}
            {!loading && filteredRules.length === 0 && (
              <tr><td className="px-5 py-8 text-center text-gray-600" colSpan={9}>No firewall rules configured</td></tr>
            )}
            {filteredRules.map(rule => (
              <tr key={rule.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                <td className="px-5 py-3 font-mono">#{rule.id}</td>
                <td className="px-5 py-3">{rule.direction}</td>
                <td className="px-5 py-3">{rule.protocol}</td>
                <td className="px-5 py-3 font-mono">{rule.src}</td>
                <td className="px-5 py-3 font-mono">{rule.dst}</td>
                <td className="px-5 py-3 font-mono">{rule.port}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    rule.action === 'ALLOW' ? 'bg-green-900/50 text-green-500 border-green-800/30' : 
                    rule.action === 'DROP' ? 'bg-red-900/50 text-red-500 border-red-800/30' :
                    'bg-yellow-900/50 text-yellow-500 border-yellow-800/30'
                  }`}>{rule.action}</span>
                </td>
                <td className="px-5 py-3">
                  <div className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${rule.active ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <button 
                    onClick={() => handleDeleteRule(rule)} 
                    title="Delete rule"
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0a0a0a] border border-gray-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
              <form onSubmit={handleAddRule}>
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">Add Firewall Rule</h2>
                  <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Direction</label>
                      <select 
                        value={newRule.direction} 
                        onChange={e => setNewRule({ ...newRule, direction: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                      >
                        <option value="IN">IN</option>
                        <option value="OUT">OUT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Protocol</label>
                      <select 
                        value={newRule.protocol} 
                        onChange={e => setNewRule({ ...newRule, protocol: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                      >
                        <option value="TCP">TCP</option>
                        <option value="UDP">UDP</option>
                        <option value="ICMP">ICMP</option>
                        <option value="ANY">ANY</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Source IP / CIDR</label>
                      <input 
                        type="text" 
                        value={newRule.src}
                        onChange={e => setNewRule({ ...newRule, src: e.target.value })}
                        placeholder="e.g. 192.168.1.100" 
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 font-mono" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Destination IP / CIDR</label>
                      <input 
                        type="text" 
                        value={newRule.dst}
                        onChange={e => setNewRule({ ...newRule, dst: e.target.value })}
                        placeholder="e.g. ANY" 
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 font-mono" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Target Port(s)</label>
                    <input 
                      type="text" 
                      value={newRule.port}
                      onChange={e => setNewRule({ ...newRule, port: e.target.value })}
                      placeholder="e.g. 80, 443" 
                      className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Action</label>
                    <select 
                      value={newRule.action} 
                      onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                    >
                      <option value="DROP">DROP</option>
                      <option value="DENY">DENY</option>
                      <option value="ALLOW">ALLOW</option>
                    </select>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex justify-end space-x-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save Rule</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

