import { useState, useEffect } from 'react';
import { fetchDashboardStats } from '../services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function Settings() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [endpoint, setEndpoint] = useState('http://localhost:5000/api');

  useEffect(() => {
    (async () => {
      try {
        await fetchDashboardStats();
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Settings & Backend Status</h1>
      
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg p-6 max-w-2xl space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Backend Connectivity</h3>
          <div className="flex items-center space-x-3 mb-4">
            {apiStatus === 'online' ? (
              <span className="flex items-center text-xs font-mono text-green-400 bg-green-950/40 border border-green-800/50 px-3 py-1 rounded-full">
                <CheckCircle2 size={14} className="mr-1.5" /> Flask API Backend: ONLINE (http://localhost:5000)
              </span>
            ) : apiStatus === 'offline' ? (
              <span className="flex items-center text-xs font-mono text-red-400 bg-red-950/40 border border-red-800/50 px-3 py-1 rounded-full">
                <AlertCircle size={14} className="mr-1.5" /> Backend Unreachable - Start `python api/api.py`
              </span>
            ) : (
              <span className="text-xs font-mono text-gray-400">Testing connection...</span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Backend API Base URL</label>
              <input 
                type="text" 
                value={endpoint} 
                onChange={e => setEndpoint(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Packet Sniffer Interface</label>
              <select className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
                <option>Npcap Loopback / Default NIC (Windows)</option>
                <option>eth0</option>
                <option>wlan0</option>
                <option>any</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Environment & Engine</h3>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-gray-300 text-sm">Theme</div>
              <div className="text-gray-500 text-xs">Locked to SOC Cyber Dark Mode</div>
            </div>
            <div className="w-10 h-5 rounded-full bg-cyan-500 flex items-center p-1 cursor-pointer">
               <div className="w-3 h-3 rounded-full bg-white shadow-md transform translate-x-5"></div>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-gray-300 text-sm">WebSocket Real-Time Broadcast</div>
              <div className="text-gray-500 text-xs">Socket.IO streaming live telemetry & security events</div>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

