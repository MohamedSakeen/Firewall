import { useState, useEffect } from 'react';
import { Bell, Search, Activity, ShieldCheck, AlertCircle } from 'lucide-react';
import { fetchHealth } from '../../services/api';

export default function Topbar() {
  const [health, setHealth] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const data = await fetchHealth();
        setHealth(data);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center space-x-4 text-gray-400">
        <div className="flex items-center px-3 py-1 bg-gray-900 rounded-full border border-gray-800">
          <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`text-xs font-mono tracking-wider font-semibold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOnline ? 'ENGINE ONLINE (CONNECTED)' : 'ENGINE DISCONNECTED'}
          </span>
        </div>

        {health && (
          <div className="hidden md:flex items-center space-x-2 text-xs text-gray-400">
            <ShieldCheck size={14} className="text-cyan-400" />
            <span>Health: <strong className="text-white">{health.overall_status}</strong></span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search IPs, rules, alerts..." 
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-64"
          />
        </div>

        <button className="relative p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors" title="System Notifications">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-black text-[10px] flex items-center justify-center font-bold">3</span>
        </button>
      </div>
    </header>
  );
}
