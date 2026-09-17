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
import IncidentsView from './pages/IncidentsView';
import AttackGraphView from './pages/AttackGraphView';
import PolicySimulatorView from './pages/PolicySimulatorView';
import BehaviorDashboard from './pages/BehaviorDashboard';
import AdaptiveDefense from './pages/AdaptiveDefense';
import ThreatHunt from './pages/ThreatHunt';
import AssetInventory from './pages/AssetInventory';
import ModelHealth from './pages/ModelHealth';
import SecurityEventsView from './pages/SecurityEventsView';

function App() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4" style={{ background: 'var(--bg-app)' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<SecurityEventsView />} />
            <Route path="/behavior" element={<BehaviorDashboard />} />
            <Route path="/adaptive-defense" element={<AdaptiveDefense />} />
            <Route path="/threat-hunt" element={<ThreatHunt />} />
            <Route path="/incidents" element={<IncidentsView />} />
            <Route path="/attack-graph" element={<AttackGraphView />} />
            <Route path="/simulator" element={<PolicySimulatorView />} />
            <Route path="/assets" element={<AssetInventory />} />
            <Route path="/models" element={<ModelHealth />} />
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
