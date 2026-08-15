import { useState, useEffect } from 'react';
import { Activity, ShieldAlert, ShieldBan, FileJson, Server } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchDashboardStats, fetchRecentAlerts, fetchTrafficSummary } from '../services/api';
import { connectSocket } from '../services/socket';

const COLORS = ['#f59e0b', '#ef4444', '#06b6d4', '#10b981'];

const severityColors = {
  critical: 'bg-red-900/50 text-red-500 border-red-800/30',
  high: 'bg-orange-900/50 text-orange-500 border-orange-800/30',
  medium: 'bg-yellow-900/50 text-yellow-500 border-yellow-800/30',
  low: 'bg-blue-900/50 text-blue-500 border-blue-800/30',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [threatData, setThreatData] = useState([]);
  const [packetData, setPacketData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [statsData, recentData, summaryData] = await Promise.all([
          fetchDashboardStats(),
          fetchRecentAlerts(),
          fetchTrafficSummary(),
        ]);
        if (!mounted) return;
        setStats(statsData);
        setRecentAlerts(recentData);
        setThreatData(statsData.threatDistribution || []);
        
        if (summaryData.bandwidthData && summaryData.bandwidthData.length > 0) {
          const chartData = summaryData.bandwidthData.map(b => ({
            time: b.time,
            normal: b.rx,
            suspicious: b.tx
          }));
          setPacketData(chartData);
        }
      } catch {
        console.warn('Dashboard fetch failed, using fallback');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    const socket = connectSocket();
    socket.on('packet', () => {
      setStats(prev => prev ? { ...prev, totalPackets: (prev.totalPackets || 0) + 1 } : prev);
    });
    socket.on('alert', (newAlert) => {
      setRecentAlerts(prev => [newAlert, ...prev].slice(0, 10));
      setStats(prev => prev ? { 
        ...prev, 
        idsAlerts: (prev.idsAlerts || 0) + 1,
        criticalAlerts: newAlert.severity === 'critical' ? (prev.criticalAlerts || 0) + 1 : (prev.criticalAlerts || 0)
      } : prev);
    });
    socket.on('block', () => {
      setStats(prev => prev ? { ...prev, threatsBlocked: (prev.threatsBlocked || 0) + 1 } : prev);
    });

    return () => { 
      mounted = false; 
      clearInterval(interval);
      socket.off('packet');
      socket.off('alert');
      socket.off('block');
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Security Operation Center</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 shadow-lg animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-800 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        <StatCard title="Total Packets (24h)" value={(stats?.totalPackets ?? 0).toLocaleString()} icon={Activity} colorClass="bg-blue-500" subtitle="From sniffer" />
        <StatCard title="Threats Blocked" value={(stats?.threatsBlocked ?? 0).toLocaleString()} icon={ShieldBan} colorClass="bg-green-500" subtitle="IPS interventions" />
        <StatCard title="IDS Alerts" value={(stats?.idsAlerts ?? 0).toLocaleString()} icon={ShieldAlert} colorClass="bg-red-500" subtitle={`${stats?.criticalAlerts ?? 0} Critical`} />
        <StatCard title="Active Rules" value={(stats?.activeRules ?? 0).toLocaleString()} icon={FileJson} colorClass="bg-yellow-500" subtitle="Firewall + IDS" />
        <StatCard title="System Uptime" value={stats?.uptime ?? "N/A"} icon={Server} colorClass="bg-cyan-500" subtitle="Engine v2.1.0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
          <h3 className="text-gray-300 font-medium mb-4">Packet Traffic Volume (RX / TX)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={packetData.length > 0 ? packetData : [{ time: '00:00', normal: 0, suspicious: 0 }]}>
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
                <Area type="monotone" dataKey="normal" name="RX Traffic" stroke="#06b6d4" fillOpacity={1} fill="url(#colorNormal)" />
                <Area type="monotone" dataKey="suspicious" name="TX Traffic" stroke="#ef4444" fillOpacity={1} fill="url(#colorSuspicious)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
          <h3 className="text-gray-300 font-medium mb-4">Threat Distribution</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={threatData.length > 0 ? threatData : [{ name: 'No Data', value: 1 }]} innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {threatData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800 bg-gray-800/30">
          <h3 className="text-gray-300 font-medium">Recent Suspicious Alerts</h3>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-5 py-3 font-medium">Time (UTC)</th>
                <th className="px-5 py-3 font-medium">Source IP</th>
                <th className="px-5 py-3 font-medium">Threat Type</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.length === 0 && (
                <tr className="border-b border-gray-800">
                  <td className="px-5 py-8 text-center text-gray-600" colSpan={5}>No alerts recorded</td>
                </tr>
              )}
              {recentAlerts.slice(-6).map((alert, i) => (
                <tr key={i} className={`border-b border-gray-800 hover:bg-gray-800/30 font-mono text-xs ${alert.severity === 'critical' ? 'bg-red-900/10' : ''}`}>
                  <td className="px-5 py-3">{alert.timestamp}</td>
                  <td className="px-5 py-3 text-red-500">{alert.src_ip}</td>
                  <td className="px-5 py-3 font-sans text-gray-300">{alert.attack}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[alert.severity] || severityColors.medium}`}>{alert.severity?.toUpperCase()}</span>
                  </td>
                  <td className="px-5 py-3 text-cyan-500 font-bold">{alert.score > 50 ? 'BLOCKED' : 'ALERT'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

