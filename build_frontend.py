import os

base_dir = r"p:\Firewall\frontend\src"

directories = [
    "pages",
    "components",
    "components/layout",
    "components/ui",
    "components/charts",
    "store",
    "store/slices",
    "services"
]

for d in directories:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

files = {
    "store/index.js": """import { configureStore } from '@reduxjs/toolkit';
import alertsReducer from './slices/alertsSlice';
import packetsReducer from './slices/packetsSlice';
import firewallReducer from './slices/firewallSlice';
import ipsReducer from './slices/ipsSlice';
import rulesReducer from './slices/rulesSlice';

export const store = configureStore({
  reducer: {
    alerts: alertsReducer,
    packets: packetsReducer,
    firewall: firewallReducer,
    ips: ipsReducer,
    rules: rulesReducer,
  },
});
""",

    "store/slices/alertsSlice.js": """import { createSlice } from '@reduxjs/toolkit';
const initialState = { alerts: [], loading: false, error: null };
export const alertsSlice = createSlice({
  name: 'alerts', initialState, reducers: {
    setAlerts: (state, action) => { state.alerts = action.payload; }
  }
});
export const { setAlerts } = alertsSlice.actions;
export default alertsSlice.reducer;
""",

    "store/slices/packetsSlice.js": """import { createSlice } from '@reduxjs/toolkit';
export const packetsSlice = createSlice({
  name: 'packets', initialState: { stream: [], isPaused: false }, reducers: {
    addPacket: (state, action) => { if (!state.isPaused) state.stream.unshift(action.payload); },
    togglePause: (state) => { state.isPaused = !state.isPaused; }
  }
});
export const { addPacket, togglePause } = packetsSlice.actions;
export default packetsSlice.reducer;
""",

    "store/slices/firewallSlice.js": """import { createSlice } from '@reduxjs/toolkit';
export const firewallSlice = createSlice({
  name: 'firewall', initialState: { rules: [] }, reducers: {
    setRules: (state, action) => { state.rules = action.payload; }
  }
});
export const { setRules } = firewallSlice.actions;
export default firewallSlice.reducer;
""",

    "store/slices/ipsSlice.js": """import { createSlice } from '@reduxjs/toolkit';
export const ipsSlice = createSlice({
  name: 'ips', initialState: { actions: [], currentlyBlocked: [] }, reducers: {
    setActions: (state, action) => { state.actions = action.payload; },
    setBlocked: (state, action) => { state.currentlyBlocked = action.payload; }
  }
});
export const { setActions, setBlocked } = ipsSlice.actions;
export default ipsSlice.reducer;
""",
    
    "store/slices/rulesSlice.js": """import { createSlice } from '@reduxjs/toolkit';
export const rulesSlice = createSlice({
  name: 'rules', initialState: { configurations: {} }, reducers: {
    setConfigurations: (state, action) => { state.configurations = action.payload; }
  }
});
export const { setConfigurations } = rulesSlice.actions;
export default rulesSlice.reducer;
""",

    "services/api.js": """import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000/api' });
export default api;
""",

    "main.jsx": """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Provider } from 'react-redux'
import { store } from './store'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
""",

    "App.jsx": """import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './pages/Dashboard';
import Firewall from './pages/Firewall';
import IDSAlerts from './pages/IDSAlerts';
import IPSActions from './pages/IPSActions';
import PacketInspector from './pages/PacketInspector';
import RulesManager from './pages/RulesManager';
import LogsViewer from './pages/LogsViewer';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="flex bg-[#0a0e1a] text-gray-200 min-h-screen font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900/50 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/firewall" element={<Firewall />} />
            <Route path="/ids" element={<IDSAlerts />} />
            <Route path="/ips" element={<IPSActions />} />
            <Route path="/packets" element={<PacketInspector />} />
            <Route path="/rules" element={<RulesManager />} />
            <Route path="/logs" element={<LogsViewer />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
""",

    "index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background-color: #0a0e1a;
  color: #e5e7eb;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #111827;
}
::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
}
""",

    "components/layout/Sidebar.jsx": """import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, ShieldAlert, ShieldBan, Activity, FileJson, ScrollText, Settings, User } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/firewall', label: 'Firewall Rules', icon: Shield },
  { path: '/ids', label: 'IDS Alerts', icon: ShieldAlert },
  { path: '/ips', label: 'IPS Actions', icon: ShieldBan },
  { path: '/packets', label: 'Packet Inspector', icon: Activity },
  { path: '/rules', label: 'Rules Manager', icon: FileJson },
  { path: '/logs', label: 'Logs Viewer', icon: ScrollText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-[#111827] border-r border-gray-800 flex flex-col h-screen">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <Shield size={28} className="text-cyan-500 mr-3" />
        <span className="text-xl font-bold tracking-wider text-white">NetGuard</span>
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({isActive}) => `flex items-center px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-cyan-500/10 text-cyan-400 font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800 flex items-center">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
          <User size={20} className="text-gray-300" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-200">Admin User</div>
          <div className="text-xs text-gray-400">Security Analyst</div>
        </div>
      </div>
    </div>
  );
}
""",

    "components/layout/Topbar.jsx": """import { Bell, Search } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="h-16 bg-[#111827]/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center text-gray-400">
        <div className="flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          <span className="text-sm font-mono tracking-widest text-green-400/80">SYSTEM ONLINE</span>
        </div>
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
        
        <button className="relative p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">3</span>
        </button>
      </div>
    </header>
  );
}
""",
    
    "components/ui/StatCard.jsx": """export default function StatCard({ title, value, icon: Icon, colorClass, subtitle }) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
      </div>
    </div>
  );
}
""",

    "pages/Dashboard.jsx": """import { Activity, ShieldAlert, ShieldBan, FileJson, Server } from 'lucide-react';
import StatCard from '../components/ui/StatCard';

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
          <div className="h-full flex items-center justify-center text-gray-600">Chart Placeholder (Recharts AreaChart)</div>
        </div>
        
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
          <h3 className="text-gray-300 font-medium mb-4">Threat Distribution</h3>
          <div className="h-full flex items-center justify-center text-gray-600">Chart Placeholder (Recharts Donut)</div>
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 bg-gray-800/30">
          <h3 className="text-gray-300 font-medium">Recent Suspicious Alerts</h3>
        </div>
        <div className="overflow-x-auto">
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
              {/* Example row */ }
              <tr className="border-b border-gray-800 hover:bg-gray-800/30 font-mono text-xs">
                <td className="px-5 py-3">2026-05-21 14:32:01</td>
                <td className="px-5 py-3 text-red-400">198.51.100.42</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
""",

    "pages/Firewall.jsx": """export default function Firewall() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Firewall Rules</h1>
      <p className="text-gray-400">Table of firewall rules and controls will go here.</p>
    </div>
  );
}
""",
    "pages/IDSAlerts.jsx": """export default function IDSAlerts() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">IDS Alerts</h1>
      <p className="text-gray-400">Alerts log and graphs will go here.</p>
    </div>
  );
}
""",
    "pages/IPSActions.jsx": """export default function IPSActions() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">IPS Actions</h1>
      <p className="text-gray-400">Intrusion Prevention system configuration and logs will go here.</p>
    </div>
  );
}
""",
    "pages/PacketInspector.jsx": """export default function PacketInspector() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Packet Inspector</h1>
      <p className="text-gray-400">Live stream of packets will go here.</p>
    </div>
  );
}
""",
    "pages/RulesManager.jsx": """export default function RulesManager() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Rules Manager</h1>
      <p className="text-gray-400">Rule configuration tabs will go here.</p>
    </div>
  );
}
""",
    "pages/LogsViewer.jsx": """export default function LogsViewer() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Logs Viewer</h1>
      <p className="text-gray-400">Terminal style log viewer will go here.</p>
    </div>
  );
}
""",
    "pages/Settings.jsx": """export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
      <p className="text-gray-400">System configuration options will go here.</p>
    </div>
  );
}
"""
}

for filepath, content in files.items():
    with open(os.path.join(base_dir, filepath), "w", encoding="utf-8") as f:
        f.write(content)

print(f"Generated {len(files)} files in {base_dir}")
