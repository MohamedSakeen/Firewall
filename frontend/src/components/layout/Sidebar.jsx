import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Shield, ShieldAlert, ShieldBan, Activity, Network, FileJson, ScrollText, Settings, User, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/firewall', label: 'Firewall Rules', icon: Shield },
  { path: '/ids', label: 'IDS Alerts', icon: ShieldAlert },
  { path: '/ips', label: 'IPS Actions', icon: ShieldBan },
  { path: '/packets', label: 'Packet Inspector', icon: Activity },
  { path: '/traffic', label: 'Network Traffic', icon: Network },
  { path: '/rules', label: 'Rules Manager', icon: FileJson },
  { path: '/logs', label: 'Logs Viewer', icon: ScrollText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="bg-[#111827] border-r border-gray-800 flex flex-col h-screen shrink-0 relative"
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-gray-800 border border-gray-700 rounded-full p-1 text-gray-400 hover:text-white z-50 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="h-16 flex items-center px-6 border-b border-gray-800 overflow-hidden whitespace-nowrap">
        <Shield size={28} className="text-cyan-500 shrink-0" style={{ marginRight: isCollapsed ? '0' : '0.75rem' }} />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }} 
              animate={{ opacity: 1, width: "auto" }} 
              exit={{ opacity: 0, width: 0 }} 
              className="text-xl font-bold tracking-wider text-white"
            >
              NetGuard
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({isActive}) => `flex items-center px-3 py-2.5 rounded-lg transition-colors overflow-hidden ${isActive ? 'bg-cyan-500/10 text-cyan-400 font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
              >
                <Icon size={20} className="shrink-0" style={{ marginRight: isCollapsed ? '0' : '0.75rem' }} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -10 }} 
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800 flex items-center overflow-hidden">
        <div className="w-10 h-10 shrink-0 rounded-full bg-gray-700 flex items-center justify-center" style={{ marginRight: isCollapsed ? '0' : '0.75rem' }}>
          <User size={20} className="text-gray-300" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, width: 0 }} 
              animate={{ opacity: 1, width: 'auto' }} 
              exit={{ opacity: 0, width: 0 }} 
              className="whitespace-nowrap"
            >
              <div className="text-sm font-medium text-gray-200">Admin User</div>
              <div className="text-xs text-gray-400">Security Analyst</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
