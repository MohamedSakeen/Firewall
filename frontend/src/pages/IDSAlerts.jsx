import { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, ChevronRight, ShieldBan, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAlerts, blockIp } from '../services/api';
import { connectSocket } from '../services/socket';

const severityColors = {
  CRITICAL: 'bg-red-900/50 text-red-400 border-red-800/40 font-bold',
  HIGH: 'bg-orange-900/50 text-orange-400 border-orange-800/40 font-bold',
  MEDIUM: 'bg-yellow-900/50 text-yellow-400 border-yellow-800/40 font-bold',
  LOW: 'bg-blue-900/50 text-blue-400 border-blue-800/40 font-bold'
};

export default function IDSAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockingStatus, setBlockingStatus] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const data = await fetchAlerts();
        if (mounted) setAlerts(data || []);
      } catch {
        console.warn('Failed to fetch alerts');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);

    const socket = connectSocket();
    socket.on('alert', (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    return () => { 
      mounted = false; 
      clearInterval(interval);
      socket.off('alert');
    };
  }, []);

  const handleBlockIp = async () => {
    if (!selectedAlert || !selectedAlert.src_ip) return;
    setBlockingStatus(true);
    try {
      await blockIp(selectedAlert.src_ip, selectedAlert.attack || 'IDS Alert Block');
      setNotification({ type: 'success', message: `IP ${selectedAlert.src_ip} successfully quarantined!` });
    } catch (e) {
      setNotification({ type: 'error', message: 'Failed to block IP' });
    } finally {
      setBlockingStatus(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const filteredAlerts = alerts.filter(a =>
    a.src_ip?.includes(search) ||
    a.attack?.toLowerCase().includes(search.toLowerCase()) ||
    a.severity?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' : 'bg-red-950/80 border-red-500/50 text-red-300'}`}>
          <CheckCircle size={18} />
          {notification.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" /> Intrusion Detection (IDS) Alerts
          </h1>
          <p className="text-gray-400 text-sm">Real-time signature & heuristic anomaly detection events</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search alerts by IP/type..." 
              className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 w-64" 
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/80 border-b border-gray-800 sticky top-0 font-semibold">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Alert ID</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Source IP</th>
                  <th className="px-5 py-3">Signature</th>
                  <th className="px-5 py-3">Threat Score</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={6}>Loading security alerts...</td></tr>
                )}
                {!loading && filteredAlerts.length === 0 && (
                  <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={6}>No alerts matching filter</td></tr>
                )}
                {filteredAlerts.slice().reverse().map((alert, i) => (
                  <tr key={i} onClick={() => setSelectedAlert(alert)} className={`border-b border-gray-800/60 hover:bg-gray-800/40 cursor-pointer transition-colors ${selectedAlert === alert ? 'bg-cyan-950/30 border-l-4 border-l-cyan-500' : ''}`}>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{alert.timestamp?.split(' ')[1]?.split('.')[0] || alert.timestamp}</td>
                    <td className="px-5 py-3 font-mono text-xs text-cyan-400">ALT-{String(i + 1).padStart(3, '0')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded text-xs border ${severityColors[alert.severity?.toUpperCase()] || severityColors.MEDIUM}`}>{alert.severity?.toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-red-400 font-bold">{alert.src_ip}</td>
                    <td className="px-5 py-3 text-white font-medium">{alert.attack}</td>
                    <td className="px-5 py-3 font-mono text-xs text-yellow-400 font-bold">{alert.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence>
          {selectedAlert && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-y-auto flex flex-col shrink-0">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 sticky top-0">
                <h2 className="text-lg font-bold text-white flex items-center">
                  <AlertTriangle size={18} className="mr-2 text-yellow-400" /> Alert Details
                </h2>
                <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-white p-1"><ChevronRight size={20} /></button>
              </div>
              <div className="p-5 space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Matched Signature</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${severityColors[selectedAlert.severity?.toUpperCase()] || severityColors.MEDIUM}`}>{selectedAlert.severity?.toUpperCase()}</span>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white font-medium">{selectedAlert.attack}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Source IP</span>
                    <div className="font-mono text-sm text-red-400 font-bold">{selectedAlert.src_ip}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Threat Score</span>
                    <div className="font-mono text-sm text-yellow-400 font-bold">{selectedAlert.score} / 100</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Timestamp</span>
                    <div className="font-mono text-sm text-gray-300">{selectedAlert.timestamp}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <button 
                    onClick={handleBlockIp}
                    disabled={blockingStatus}
                    className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ShieldBan size={18} />
                    {blockingStatus ? 'Applying Block...' : 'Quarantine Source IP'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
