import { Activity, ShieldAlert, ShieldBan, FileJson, Server } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const packetData = [
  { time: '00:00', normal: 4000, suspicious: 240 },
  { time: '04:00', normal: 3000, suspicious: 139 },
  { time: '08:00', normal: 2000, suspicious: 980 },
  { time: '12:00', normal: 2780, suspicious: 390 },
  { time: '16:00', normal: 1890, suspicious: 480 },
  { time: '20:00', normal: 2390, suspicious: 380 },
  { time: '24:00', normal: 3490, suspicious: 430 },
];

const threatData = [
  { name: 'Port Scan', value: 400 },
  { name: 'DDoS', value: 300 },
  { name: 'SQL Injection', value: 300 },
  { name: 'XSS Attempt', value: 200 },
];
const COLORS = ['#f59e0b', '#ef4444', '#06b6d4', '#10b981'];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Security Operation Center</h1>
        <div className="flex items-center text-sm font-mono px-3 py-1 bg-green-900/20 text-green-400 border border-green-800/30 rounded-full cursor-default">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          LIVE
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Packets (24h)" value="12.4M" icon={Activity} colorClass="bg-blue-500" subtitle="↑ 1.2% from yesterday" />
        <StatCard title="Threats Blocked" value="4,821" icon={ShieldBan} colorClass="bg-green-500" subtitle="IPS interventions" />
        <StatCard title="IDS Alerts" value="214" icon={ShieldAlert} colorClass="bg-red-500" subtitle="23 Critical" />
        <StatCard title="Active Rules" value="842" icon={FileJson} colorClass="bg-yellow-500" subtitle="Firewall + IDS" />
        <StatCard title="System Uptime" value="14d 08h" icon={Server} colorClass="bg-cyan-500" subtitle="Engine v2.1.0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
          <h3 className="text-gray-300 font-medium mb-4">Packet Traffic Volume</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={packetData}>
                <defs>
                  <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                <Area type="monotone" dataKey="normal" stroke="#06b6d4" fillOpacity={1} fill="url(#colorNormal)" />
                <Area type="monotone" dataKey="suspicious" stroke="#ef4444" fillOpacity={1} fill="url(#colorSuspicious)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
          <h3 className="text-gray-300 font-medium mb-4">Threat Distribution</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={threatData} innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {threatData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800 bg-gray-800/30">
          <h3 className="text-gray-300 font-medium">Recent Suspicious Alerts</h3>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-5 py-3 font-medium">Time (UTC)</th>
                <th className="px-5 py-3 font-medium">Source IP</th>
                <th className="px-5 py-3 font-medium">Target IP</th>
                <th className="px-5 py-3 font-medium">Threat Type</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800 hover:bg-gray-800/30 font-mono text-xs">
                <td className="px-5 py-3">2026-05-21 14:32:01</td>
                <td className="px-5 py-3 text-red-500">198.51.100.42</td>
                <td className="px-5 py-3">10.0.0.15:443</td>
                <td className="px-5 py-3 font-sans text-gray-300">Port Scan Detected</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-900/50 text-yellow-500 border border-yellow-800/30">MEDIUM</span></td>
                <td className="px-5 py-3 text-cyan-500 font-bold">ALERT</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-gray-800/30 font-mono text-xs bg-red-900/10">
                <td className="px-5 py-3">2026-05-21 14:31:45</td>
                <td className="px-5 py-3 text-red-500 font-bold">203.0.113.88</td>
                <td className="px-5 py-3">10.0.0.22:22</td>
                <td className="px-5 py-3 font-sans text-gray-300">SSH Brute Force</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-500 border border-red-800/30">CRITICAL</span></td>
                <td className="px-5 py-3 text-green-500 font-bold">BLOCKED</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-gray-800/30 font-mono text-xs">
                <td className="px-5 py-3">2026-05-21 14:30:12</td>
                <td className="px-5 py-3 text-red-500">185.199.108.7</td>
                <td className="px-5 py-3">10.0.0.50:80</td>
                <td className="px-5 py-3 font-sans text-gray-300">SQL Injection</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-900/50 text-orange-500 border border-orange-800/30">HIGH</span></td>
                <td className="px-5 py-3 text-green-500 font-bold">BLOCKED</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-gray-800/30 font-mono text-xs">
                <td className="px-5 py-3">2026-05-21 14:28:34</td>
                <td className="px-5 py-3 text-red-500">192.168.1.100</td>
                <td className="px-5 py-3">8.8.8.8:53</td>
                <td className="px-5 py-3 font-sans text-gray-300">Suspicious DNS Request</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-500 border border-blue-800/30">LOW</span></td>
                <td className="px-5 py-3 text-cyan-500 font-bold">ALERT</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
