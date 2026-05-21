import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './pages/Dashboard';
import Firewall from './pages/Firewall';
import IDSAlerts from './pages/IDSAlerts';
import IPSActions from './pages/IPSActions';
import PacketInspector from './pages/PacketInspector';
import NetworkTraffic from './pages/NetworkTraffic';
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
            <Route path="/traffic" element={<NetworkTraffic />} />
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
