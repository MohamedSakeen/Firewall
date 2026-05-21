import { useState } from 'react';
import { Activity, ArrowDownToLine, ArrowUpToLine, Globe, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/ui/StatCard';

const bandwidthData = [
  { time: '10:00', rx: 120, tx: 80 },
  { time: '10:05', rx: 400, tx: 150 },
  { time: '10:10', rx: 800, tx: 300 },
  { time: '10:15', rx: 300, tx: 120 },
  { time: '10:20', rx: 900, tx: 400 },
  { time: '10:25', rx: 1500, tx: 600 },
  { time: '10:30', rx: 1200, tx: 450 },
];

const activeConnections = [
  { id: 1, src: '192.168.1.100:5421', dst: '8.8.8.8:53', state: 'ESTABLISHED', bytes: '1.2 MB', duration: '05:22' },
  { id: 2, src: '10.0.0.15:443', dst: '198.51.100.42:34212', state: 'TIME_WAIT', bytes: '43 KB', duration: '00:12' },
  { id: 3, src: '10.0.0.22:22', dst: '203.0.113.88:51233', state: 'ESTABLISHED', bytes: '12.4 MB', duration: '45:10' },
  { id: 4, src: '192.168.1.50:80', dst: '185.199.108.7:44332', state: 'CLOSE_WAIT', bytes: '8 KB', duration: '00:03' },
  { id: 5, src: '10.0.0.50:443', dst: '203.0.113.50:12345', state: 'ESTABLISHED', bytes: '2.1 MB', duration: '12:05' },
];

export default function NetworkTraffic() {
  const [connections] = useState(activeConnections);

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
        <StatCard title="Current RX Bandwidth" value="1.5 Gbps" icon={ArrowDownToLine} colorClass="bg-green-500" subtitle="Peak: 2.1 Gbps" />
        <StatCard title="Current TX Bandwidth" value="600 Mbps" icon={ArrowUpToLine} colorClass="bg-blue-500" subtitle="Peak: 900 Mbps" />
        <StatCard title="Active Connections" value="14,233" icon={Globe} colorClass="bg-purple-500" subtitle="ESTABLISHED" />
        <StatCard title="Total Traffic (24h)" value="4.2 TB" icon={Server} colorClass="bg-cyan-500" subtitle="In & Out" />
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
        <h3 className="text-gray-300 font-medium mb-4 flex items-center">
          <Activity size={18} className="mr-2 text-cyan-400" /> Live Bandwidth Usage (Mbps)
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bandwidthData}>
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
              <Area type="monotone" dataKey="rx" name="RX (Download)" stroke="#10b981" fillOpacity={1} fill="url(#colorRx)" />
              <Area type="monotone" dataKey="tx" name="TX (Upload)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTx)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col font-mono">
        <div className="px-5 py-4 border-b border-gray-800 bg-gray-800/30 flex justify-between">
          <h3 className="text-gray-300 font-medium font-sans">Top Active Connections</h3>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Source (Local)</th>
                <th className="px-4 py-3">Destination (Remote)</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Data Exchanged</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {connections.map(c => (
                <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/50 text-xs">
                  <td className="px-4 py-3 text-blue-400">{c.src}</td>
                  <td className="px-4 py-3 text-cyan-400">{c.dst}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.state === 'ESTABLISHED' ? 'bg-green-900/30 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                      {c.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{c.bytes}</td>
                  <td className="px-4 py-3 text-gray-300">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
