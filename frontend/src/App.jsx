import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { UNAUTHORIZED_EVENT } from './services/api';
import { checkAuth, selectAuthStatus, sessionExpired } from './store/slices/authSlice';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Login from './pages/Login';
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

function SessionLoading() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>ValaiAran</div>
        <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Checking session…</div>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const status = useSelector(selectAuthStatus);
  const location = useLocation();
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function ConsoleLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4" style={{ background: 'var(--bg-app)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  const dispatch = useDispatch();
  const status = useSelector(selectAuthStatus);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    dispatch(checkAuth());
  }, [dispatch]);

  useEffect(() => {
    const handleUnauthorized = () => dispatch(sessionExpired());
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [dispatch]);

  if (status === 'idle' || status === 'checking') return <SessionLoading />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ConsoleLayout />}>
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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
