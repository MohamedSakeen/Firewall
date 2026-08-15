import { useState, useEffect } from 'react';
import { ShieldBan, Clock, Unlock, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchBlocked, unblockIp, blockIp } from '../services/api';
import { connectSocket } from '../services/socket';

export default function IPSActions() {
  const [blockList, setBlockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('Manual Block');
  const [autoBlock, setAutoBlock] = useState(true);

  const loadBlocked = async () => {
    try {
      const data = await fetchBlocked();
      setBlockList(data);
    } catch {
      console.warn('Failed to fetch blocked IPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocked();
    const interval = setInterval(loadBlocked, 10000);

    const socket = connectSocket();
    socket.on('block', () => {
      loadBlocked();
    });

    return () => {
      clearInterval(interval);
      socket.off('block');
    };
  }, []);

  const handleUnblock = async (ip) => {
    try {
      await unblockIp(ip);
      setBlockList(prev => prev.filter(b => b.ip !== ip));
    } catch {
      console.warn('Failed to unblock IP');
    }
  };

  const handleManualBlock = async (e) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    try {
      await blockIp(manualIp.trim(), manualReason.trim() || 'Manual Block');
      setManualIp('');
      setModalOpen(false);
      await loadBlocked();
    } catch {
      alert('Failed to block IP');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Intrusion Prevention System (IPS)</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-gray-400 mr-2 text-sm">Auto-Block:</span>
            <div 
              onClick={() => setAutoBlock(!autoBlock)} 
              className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${autoBlock ? 'bg-cyan-500' : 'bg-gray-600'}`}
            >
              <div className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${autoBlock ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors"
          >
            <Plus size={16} className="mr-1" /> Block Target IP
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between text-red-500">
          <div className="flex items-center">
            <ShieldBan size={20} className="mr-2" /> 
            <h2 className="font-bold">Currently Blocked IPs</h2>
            <span className="ml-2 text-sm text-gray-500 font-normal">({blockList.length})</span>
          </div>
          <span className="text-xs text-gray-500">Active engine ban table</span>
        </div>
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-5 py-3">IP Address</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Blocked At</th>
              <th className="px-5 py-3">Expires In</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-5 py-8 text-center text-gray-600" colSpan={5}>Loading...</td></tr>
            )}
            {!loading && blockList.length === 0 && (
              <tr><td className="px-5 py-8 text-center text-gray-600" colSpan={5}>No IPs currently blocked</td></tr>
            )}
            {blockList.map((b, i) => (
              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                <td className="px-5 py-3 font-mono text-red-400 font-bold">{b.ip}</td>
                <td className="px-5 py-3">{b.reason}</td>
                <td className="px-5 py-3 font-mono text-xs">{b.blockedAt}</td>
                <td className="px-5 py-3 flex items-center">
                  <Clock size={14} className="mr-1 text-gray-500" />
                  {b.expires}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => handleUnblock(b.ip)} className="flex items-center text-cyan-500 hover:text-cyan-400 font-bold text-xs uppercase bg-cyan-900/20 px-2 py-1 rounded">
                    <Unlock size={12} className="mr-1" /> Unblock
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0a0a0a] border border-gray-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
              <form onSubmit={handleManualBlock}>
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-red-950/20">
                  <h2 className="text-lg font-bold text-white flex items-center">
                    <ShieldBan size={18} className="mr-2 text-red-500" /> Manual IP Quarantine
                  </h2>
                  <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Target IP Address</label>
                    <input 
                      type="text" 
                      value={manualIp}
                      onChange={e => setManualIp(e.target.value)}
                      placeholder="e.g. 192.168.1.50" 
                      required
                      className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-500 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reason / Note</label>
                    <input 
                      type="text" 
                      value={manualReason}
                      onChange={e => setManualReason(e.target.value)}
                      placeholder="Manual security ban" 
                      className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-500" 
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex justify-end space-x-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">Apply Block</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

