import { Terminal } from 'lucide-react';

export default function LogsViewer() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-white">System Logs</h1>
      <div className="flex-1 bg-black border border-gray-800 rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
        <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center px-4 border-b border-gray-700 z-10">
          <Terminal size={14} className="text-gray-400 mr-2" />
          <span className="text-gray-400 text-xs font-mono">tail -f /backend/logs/engine.log</span>
        </div>
        <div className="p-4 pt-10 font-mono text-sm text-gray-300 overflow-y-auto w-full h-full whitespace-pre-wrap">
<span className="text-blue-400">[INFO]</span> 2026-05-21 14:30:10 - Engine initialized.<br/>
<span className="text-blue-400">[INFO]</span> 2026-05-21 14:30:11 - Loaded 842 firewall rules.<br/>
<span className="text-yellow-400">[WARN]</span> 2026-05-21 14:30:15 - Sniffer dropped 42 packets (buffer full).<br/>
<span className="text-red-500">[ERROR]</span> 2026-05-21 14:31:45 - IPS action failed: Table locked.<br/>
<span className="text-blue-400">[INFO]</span> 2026-05-21 14:32:01 - Alert processor triggered ALT-901.<br/>
        </div>
      </div>
    </div>
  );
}
