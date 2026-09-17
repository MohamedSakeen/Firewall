import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Shield, ShieldAlert, ShieldBan, Network,
  FileJson, ScrollText, Settings, Search, Server, ShieldCheck, Zap,
  Layers, Cpu, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';

const navSections = [
  {
    label: 'MONITORING',
    items: [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/traffic', label: 'Traffic', icon: Activity },
      { path: '/packets', label: 'Packet Inspector', icon: Network },
    ],
  },
  {
    label: 'DETECTION & RESPONSE',
    items: [
      { path: '/events', label: 'Security Events', icon: ShieldAlert },
      { path: '/ids', label: 'IDS Alerts', icon: ShieldAlert },
      { path: '/threat-hunt', label: 'Threat Hunt', icon: Search },
      { path: '/incidents', label: 'Incidents', icon: Layers },
    ],
  },
  {
    label: 'ENFORCEMENT',
    items: [
      { path: '/firewall', label: 'Firewall Rules', icon: Shield },
      { path: '/ips', label: 'IPS Actions', icon: ShieldBan },
      { path: '/adaptive-defense', label: 'Adaptive Defense', icon: ShieldCheck },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { path: '/behavior', label: 'Baselines', icon: Eye },
      { path: '/assets', label: 'Assets', icon: Server },
      { path: '/models', label: 'Model Health', icon: Zap },
      { path: '/simulator', label: 'Policy Simulator', icon: Cpu },
      { path: '/attack-graph', label: 'Attack Graph', icon: Network },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/rules', label: 'Rules Manager', icon: FileJson },
      { path: '/logs', label: 'Logs', icon: ScrollText },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex flex-col h-screen shrink-0 relative transition-all duration-200"
      style={{
        width: collapsed ? 56 : 220,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-10 z-50 flex items-center justify-center w-6 h-6 rounded-full transition-colors"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand */}
      <div
        className="flex items-center shrink-0 overflow-hidden"
        style={{
          height: 44,
          padding: collapsed ? '0 16px' : '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <Shield size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        {!collapsed && (
          <span
            className="ml-2.5 font-semibold text-sm whitespace-nowrap"
            style={{ color: 'var(--text-heading)' }}
          >
            NetGuard
          </span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <div
                className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                {section.label}
              </div>
            )}
            {collapsed && <div className="pt-2" />}
            <nav className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded transition-colors ${
                        collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-1.5'
                      } ${
                        isActive
                          ? ''
                          : ''
                      }`
                    }
                    style={({ isActive }) => ({
                      background: isActive ? 'var(--accent-muted)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      fontSize: '13px',
                    })}
                  >
                    <Icon size={16} className="shrink-0" style={{ marginRight: collapsed ? 0 : 8 }} />
                    {!collapsed && (
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center shrink-0 overflow-hidden"
        style={{
          height: 40,
          padding: collapsed ? '0 16px' : '0 16px',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          fontSize: '11px',
        }}
      >
        {!collapsed && <span className="whitespace-nowrap">v2.1.0</span>}
      </div>
    </div>
  );
}
