export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
      
      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Network Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Packet Sniffer Interface</label>
            <select className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
              <option>eth0 (Default)</option>
              <option>wlan0</option>
              <option>any</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Backend API Endpoint</label>
            <input type="text" defaultValue="http://localhost:5000/api" className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-8 border-b border-gray-800 pb-2">Environment</h3>
        
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-gray-300 text-sm">Theme</div>
            <div className="text-gray-500 text-xs">Currently locked to Dark Mode</div>
          </div>
          <div className="w-10 h-5 rounded-full bg-gray-600 flex items-center p-1">
             <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
