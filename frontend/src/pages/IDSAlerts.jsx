import { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, ChevronRight, ShieldBan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAlerts, blockIp } from '../services/api';
import { connectSocket } from '../services/socket';

const severityColors = {
  CRITICAL: 'bg-red-900/50 text-red-500 border-red-800/30',
  HIGH: 'bg-orange-900/50 text-orange-500 border-orange-800/30',
  MEDIUM: 'bg-yellow-900/50 text-yellow-500 border-yellow-800/30',
  LOW: 'bg-blue-900/50 text-blue-500 border-blue-800/30'
};

export default function IDSAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockingStatus, setBlockingStatus] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const data = await fetchAlerts();
        if (mounted) setAlerts(data);
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
      alert(`IP ${selectedAlert.src_ip} successfully blocked!`);
    } catch (e) {
      console.error('Failed to block IP:', e);
    } finally {
      setBlockingStatus(false);
    }
  };

  const filteredAlerts = alerts.filter(a =>
    a.src_ip?.includes(search) ||
    a.attack?.toLowerCase().includes(search.toLowerCase()) ||
    a.severity?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full gap-6">
      <div className={`flex-1 flex flex-col space-y-4 transition-all duration-300`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">IDS Alerts</h1>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search alerts..." 
                className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500" 
              />
            </div>
            <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-md text-sm border border-gray-700 flex items-center">
              <Filter size={16} className="mr-2" /> Filter ({filteredAlerts.length})
            </button>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800 sticky top-0">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Alert ID</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Source IP</th>
                  <th className="px-5 py-3">Signature</th>
                  <th className="px-5 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td className="px-5 py-8 text-center text-gray-600" colSpan={6}>Loading...</td></tr>
                )}
                {!loading && filteredAlerts.length === 0 && (
                  <tr><td className="px-5 py-8 text-center text-gray-600" colSpan={6}>No alerts recorded</td></tr>
                )}
                {filteredAlerts.slice().reverse().map((alert, i) => (
                  <tr key={i} onClick={() => setSelectedAlert(alert)} className={`border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer ${selectedAlert === alert ? 'bg-cyan-900/10 border-l-2 border-l-cyan-500' : 'border-l-2 border-l-transparent'}`}>
                    <td className="px-5 py-3 font-mono text-xs">{alert.timestamp?.split(' ')[1]?.split('.')[0] || alert.timestamp}</td>
                    <td className="px-5 py-3 font-mono text-xs">ALT-{String(i + 1).padStart(3, '0')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[alert.severity?.toUpperCase()] || severityColors.MEDIUM}`}>{alert.severity?.toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-red-400">{alert.src_ip}</td>
                    <td className="px-5 py-3 text-gray-300">{alert.attack}</td>
                    <td className="px-5 py-3 font-mono text-xs">{alert.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedAlert && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-y-auto flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 sticky top-0">
              <h2 className="text-lg font-bold text-white flex items-center">
                <AlertTriangle size={18} className="mr-2 text-yellow-500" /> Alert Details
              </h2>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-white"><ChevronRight size={20} /></button>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Signature Matched</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[selectedAlert.severity?.toUpperCase()] || severityColors.MEDIUM}`}>{selectedAlert.severity?.toUpperCase()}</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded p-3 text-sm text-gray-200">{selectedAlert.attack}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Source</span>
                  <div className="font-mono text-sm text-red-400">{selectedAlert.src_ip}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Destination</span>
                  <div className="font-mono text-sm text-green-400">N/A</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Protocol</span>
                  <div className="font-mono text-sm text-gray-300">N/A</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Timestamp</span>
                  <div className="font-mono text-sm text-gray-300">{selectedAlert.timestamp}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Threat Score</span>
                  <div className="font-mono text-sm text-yellow-400">{selectedAlert.score}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <button 
                  onClick={handleBlockIp}
                  disabled={blockingStatus}
                  className="w-full bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-800/50 py-2 rounded-md font-medium text-sm transition-colors text-center flex items-center justify-center"
                >
                  <ShieldBan size={16} className="mr-2" />
                  {blockingStatus ? 'Blocking IP...' : 'Block Source IP'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

