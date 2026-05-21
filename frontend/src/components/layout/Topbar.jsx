import { Bell, Search } from 'lucide-react';

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
