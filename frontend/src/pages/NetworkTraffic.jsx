import { useState, useEffect } from 'react';
import { Activity, ArrowDownToLine, ArrowUpToLine, Globe, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/ui/StatCard';
import { fetchTrafficSummary } from '../services/api';
import { connectSocket } from '../services/socket';

export default function NetworkTraffic() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const data = await fetchTrafficSummary();
        if (mounted) setSummary(data);
      } catch {
        console.warn('Failed to fetch traffic summary');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    const socket = connectSocket();
    socket.on('packet', (pkt) => {
      setSummary(prev => {
        if (!prev) return prev;
        const isRx = pkt.src?.startsWith('10.');
        return {
          ...prev,
          totalPackets: (prev.totalPackets || 0) + 1,
          rxCount: isRx ? (prev.rxCount || 0) + 1 : (prev.rxCount || 0),
          txCount: !isRx ? (prev.txCount || 0) + 1 : (prev.txCount || 0)
        };
      });
    });

    return () => { 
      mounted = false; 
      clearInterval(interval);
      socket.off('packet');
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Network Traffic Monitor</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 shadow-lg animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-800 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const bandwidthData = summary?.bandwidthData || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Network Traffic Monitor</h1>
        <div className="flex items-center text-sm font-mono px-3 py-1 bg-green-900/20 text-green-400 border border-green-800/30 rounded-full cursor-default">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          MONITORING
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="RX Packets" value={(summary?.rxCount ?? 0).toLocaleString()} icon={ArrowDownToLine} colorClass="bg-green-500" subtitle="Received" />
        <StatCard title="TX Packets" value={(summary?.txCount ?? 0).toLocaleString()} icon={ArrowUpToLine} colorClass="bg-blue-500" subtitle="Sent" />
        <StatCard title="Active Connections" value={(summary?.activeConnections?.length ?? 0).toLocaleString()} icon={Globe} colorClass="bg-purple-500" subtitle="Recent sessions" />
        <StatCard title="Total Packets (24h)" value={(summary?.totalPackets ?? 0).toLocaleString()} icon={Server} colorClass="bg-cyan-500" subtitle="In & Out" />
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
        <h3 className="text-gray-300 font-medium mb-4 flex items-center">
          <Activity size={18} className="mr-2 text-cyan-400" /> Live Bandwidth Usage (packets/min)
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bandwidthData.length > 0 ? bandwidthData : [{ time: '00:00', rx: 0, tx: 0 }]}>
              <defs>
                <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} itemStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="rx" name="RX" stroke="#10b981" fillOpacity={1} fill="url(#colorRx)" />
              <Area type="monotone" dataKey="tx" name="TX" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTx)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col font-mono">
        <div className="px-5 py-4 border-b border-gray-800 bg-gray-800/30 flex justify-between">
          <h3 className="text-gray-300 font-medium font-sans">Active Connections</h3>
          <span className="text-gray-500 text-xs">Last {summary?.activeConnections?.length ?? 0} sessions</span>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Data Exchanged</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.activeConnections ?? []).length === 0 && (
                <tr><td className="px-4 py-8 text-center text-gray-600" colSpan={4}>No active connections</td></tr>
              )}
              {(summary?.activeConnections ?? []).map(c => (
                <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/50 text-xs">
                  <td className="px-4 py-3 text-blue-400">{c.src}</td>
                  <td className="px-4 py-3 text-cyan-400">{c.dst}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.state === 'ESTABLISHED' ? 'bg-green-900/30 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                      {c.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{c.bytes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

