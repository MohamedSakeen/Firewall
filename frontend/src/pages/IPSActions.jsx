import { useState, useEffect } from 'react';
import { ShieldBan, Clock, Unlock, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [notification, setNotification] = useState(null);

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
      setNotification({ type: 'success', message: `IP ${ip} unblocked successfully.` });
    } catch {
      setNotification({ type: 'error', message: 'Failed to unblock IP' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
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
      setNotification({ type: 'success', message: `IP ${manualIp} blocked successfully.` });
    } catch {
      setNotification({ type: 'error', message: 'Failed to block target IP' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' : 'bg-red-950/80 border-red-500/50 text-red-300'}`}>
          <CheckCircle size={18} />
          {notification.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldBan className="text-red-500" /> Intrusion Prevention System (IPS)
          </h1>
          <p className="text-gray-400 text-sm">Automated mitigation, active IP bans & quarantine table</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
            <span className="text-gray-300 text-xs font-semibold mr-2">Auto-Block:</span>
            <div 
              onClick={() => setAutoBlock(!autoBlock)} 
              className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${autoBlock ? 'bg-cyan-500' : 'bg-gray-600'}`}
            >
              <div className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${autoBlock ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Block Target IP
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center text-red-400 font-bold gap-2">
            <ShieldBan size={20} />
            <h2>Currently Blocked & Quarantined IPs ({blockList.length})</h2>
          </div>
          <span className="text-xs text-gray-500 font-mono">Active IPS ban table</span>
        </div>
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-900/80 border-b border-gray-800 font-semibold">
            <tr>
              <th className="px-5 py-3">IP Address</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Blocked At</th>
              <th className="px-5 py-3">Duration / Expires</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={5}>Loading blocked IP inventory...</td></tr>
            )}
            {!loading && blockList.length === 0 && (
              <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={5}>No IPs currently quarantined</td></tr>
            )}
            {blockList.map((b, i) => (
              <tr key={i} className="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors">
                <td className="px-5 py-3 font-mono text-red-400 font-bold">{b.ip}</td>
                <td className="px-5 py-3 text-gray-200">{b.reason}</td>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{b.blockedAt}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    <Clock size={12} className="mr-1 text-cyan-400" /> {b.expires}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleUnblock(b.ip)} className="inline-flex items-center text-cyan-400 hover:text-cyan-300 font-bold text-xs bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 px-3 py-1.5 rounded-lg transition-colors">
                    <Unlock size={14} className="mr-1" /> Unblock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0a0a0a] border border-gray-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
              <form onSubmit={handleManualBlock}>
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-red-950/30">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldBan size={18} className="text-red-400" /> Manual IP Quarantine
                  </h2>
                  <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">Target IP Address</label>
                    <input 
                      type="text" 
                      value={manualIp}
                      onChange={e => setManualIp(e.target.value)}
                      placeholder="e.g. 192.168.1.50" 
                      required
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">Reason / Note</label>
                    <input 
                      type="text" 
                      value={manualReason}
                      onChange={e => setManualReason(e.target.value)}
                      placeholder="Manual security ban" 
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500" 
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
