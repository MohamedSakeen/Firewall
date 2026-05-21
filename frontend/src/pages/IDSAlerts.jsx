import { useState } from 'react';
import { Search, Filter, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mockAlerts = [
  { id: 'ALT-901', time: '14:32:01', src: '198.51.100.42', dst: '10.0.0.15', sig: 'Port Scan Detected', proto: 'TCP', severity: 'MEDIUM', payload: '00 00 00 00 00 00 00 00...' },
  { id: 'ALT-902', time: '14:31:45', src: '203.0.113.88', dst: '10.0.0.22', sig: 'SSH Brute Force', proto: 'TCP', severity: 'CRITICAL', payload: '53 53 48 2d 32 2e 30 2d...' },
  { id: 'ALT-903', time: '14:30:12', src: '185.199.108.7', dst: '10.0.0.50', sig: 'SQL Injection', proto: 'HTTP', severity: 'HIGH', payload: '47 45 54 20 2f 3f 69 64...' },
  { id: 'ALT-904', time: '14:28:34', src: '192.168.1.100', dst: '8.8.8.8', sig: 'Suspicious DNS Regquest', proto: 'DNS', severity: 'LOW', payload: 'aa aa 01 00 00 01 00 00...' },
];

const severityColors = {
  CRITICAL: 'bg-red-900/50 text-red-500 border-red-800/30',
  HIGH: 'bg-orange-900/50 text-orange-500 border-orange-800/30',
  MEDIUM: 'bg-yellow-900/50 text-yellow-500 border-yellow-800/30',
  LOW: 'bg-blue-900/50 text-blue-500 border-blue-800/30'
};

export default function IDSAlerts() {
  const [selectedAlert, setSelectedAlert] = useState(null);

  return (
    <div className="flex h-full gap-6">
      <div className={`flex-1 flex flex-col space-y-4 transition-all duration-300`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">IDS Alerts</h1>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="text" placeholder="Search alerts..." className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500" />
            </div>
            <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-md text-sm border border-gray-700 flex items-center">
              <Filter size={16} className="mr-2" /> Filter
            </button>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800 sticky top-0">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Alert ID</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Source IP</th>
                  <th className="px-5 py-3">Target IP</th>
                  <th className="px-5 py-3">Signature</th>
                </tr>
              </thead>
              <tbody>
                {mockAlerts.map(alert => (
                  <tr key={alert.id} onClick={() => setSelectedAlert(alert)} className={`border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer ${selectedAlert?.id === alert.id ? 'bg-cyan-900/10 border-l-2 border-l-cyan-500' : 'border-l-2 border-l-transparent'}`}>
                    <td className="px-5 py-3 font-mono text-xs">{alert.time}</td>
                    <td className="px-5 py-3 font-mono text-xs">{alert.id}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[alert.severity]}`}>{alert.severity}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-red-400">{alert.src}</td>
                    <td className="px-5 py-3 font-mono text-xs text-green-400">{alert.dst}</td>
                    <td className="px-5 py-3 text-gray-300">{alert.sig}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedAlert && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-[#111827] border border-gray-800 rounded-xl overflow-y-auto flex flex-col shrink-0">
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[selectedAlert.severity]}`}>{selectedAlert.severity}</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded p-3 text-sm text-gray-200">{selectedAlert.sig}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Source</span>
                  <div className="font-mono text-sm text-red-400">{selectedAlert.src}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Destination</span>
                  <div className="font-mono text-sm text-green-400">{selectedAlert.dst}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Protocol</span>
                  <div className="font-mono text-sm text-gray-300">{selectedAlert.proto}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-1">Timestamp</span>
                  <div className="font-mono text-sm text-gray-300">{selectedAlert.time}</div>
                </div>
              </div>

              <div>
                <span className="text-gray-400 text-xs uppercase font-bold tracking-wider block mb-2">Payload Preview (Hex)</span>
                <div className="bg-[#0a0e1a] border border-gray-800 rounded p-3 font-mono text-xs text-gray-400 whitespace-pre overflow-x-auto">
                  {selectedAlert.payload}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <button className="w-full bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-800/50 py-2 rounded-md font-medium text-sm transition-colors text-center">
                  Block Source IP
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
