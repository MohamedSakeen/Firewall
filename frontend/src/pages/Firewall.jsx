import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mockRules = [
  { id: 1, direction: 'IN', protocol: 'TCP', src: 'ANY', dst: '10.0.0.0/8', port: '80, 443', action: 'ALLOW', hits: 14205, active: true },
  { id: 2, direction: 'IN', protocol: 'TCP', src: '198.51.100.0/24', dst: 'ANY', port: 'ANY', action: 'DROP', hits: 541, active: true },
  { id: 3, direction: 'IN', protocol: 'ICMP', src: 'ANY', dst: 'ANY', port: 'ANY', action: 'DENY', hits: 89, active: false },
  { id: 4, direction: 'OUT', protocol: 'TCP', src: '10.0.0.50', dst: 'ANY', port: '22', action: 'ALLOW', hits: 12, active: true }
];

export default function Firewall() {
  const [rules] = useState(mockRules);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Firewall Rules</h1>
        <button onClick={() => setModalOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors">
          <Plus size={16} className="mr-2" /> Add Rule
        </button>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="text" placeholder="Filter rules..." className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-64" />
          </div>
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
              <th className="px-5 py-3">Hits</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
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
                <td className="px-5 py-3 font-mono text-cyan-400">{rule.hits.toLocaleString()}</td>
                <td className="px-5 py-3">
                  <div className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${rule.active ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Add Firewall Rule</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Direction</label>
                    <select className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
                      <option>IN</option>
                      <option>OUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Protocol</label>
                    <select className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
                      <option>TCP</option>
                      <option>UDP</option>
                      <option>ICMP</option>
                      <option>ANY</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Source IP/CIDR</label>
                    <input type="text" placeholder="e.g. 192.168.1.0/24" className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Destination IP/CIDR</label>
                    <input type="text" placeholder="e.g. ANY" className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Target Port(s)</label>
                  <input type="text" placeholder="e.g. 80, 443" className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Action</label>
                  <select className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                    <option value="DROP">DROP</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex justify-end space-x-3">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save Rule</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
