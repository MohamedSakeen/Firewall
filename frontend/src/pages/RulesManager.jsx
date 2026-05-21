import { useState } from 'react';
import { Upload, Download, Save } from 'lucide-react';

export default function RulesManager() {
  const [activeTab, setActiveTab] = useState('ids');

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Rules & Policies Manager</h1>
        <div className="flex space-x-2">
          <button className="bg-gray-800 text-gray-200 px-4 py-2 rounded-md text-sm flex items-center hover:bg-gray-700">
            <Upload size={16} className="mr-2" /> Import
          </button>
          <button className="bg-gray-800 text-gray-200 px-4 py-2 rounded-md text-sm flex items-center hover:bg-gray-700">
            <Download size={16} className="mr-2" /> Export
          </button>
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg flex-1 flex flex-col">
        <div className="flex border-b border-gray-800 bg-gray-900/50 px-2 pt-2">
          {['firewall', 'ids', 'ips', 'scoring'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              {tab.toUpperCase()} RULES
            </button>
          ))}
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          {activeTab === 'ids' && (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flexjustify-between items-center bg-gray-800/50 p-2 rounded border border-gray-700">
                <span className="text-gray-300 text-sm font-mono ml-2">backend/rules/IDS/recon_rules.json</span>
              </div>
              <textarea className="w-full flex-1 bg-[#0a0e1a] border border-gray-700 rounded-md p-4 font-mono text-sm text-green-400 focus:outline-none focus:border-cyan-500 resize-none" defaultValue={`[
  {
    "id": "10001",
    "msg": "XSS Attempt Detected",
    "protocol": "HTTP",
    "pattern": "(<script>|%3Cscript%3E)",
    "severity": "HIGH"
  },
  {
    "id": "10002",
    "msg": "SQL Injection Alert",
    "protocol": "HTTP",
    "pattern": "(' OR 1=1|UNION SELECT)",
    "severity": "CRITICAL"
  }
]`} />
              <div className="flex justify-end">
                <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center">
                  <Save size={16} className="mr-2" /> Save Active Configuration
                </button>
              </div>
            </div>
          )}
          {activeTab !== 'ids' && <div className="text-gray-500 flex items-center justify-center h-full">Select a configuration to edit</div>}
        </div>
      </div>
    </div>
  );
}
