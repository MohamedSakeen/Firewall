import { ShieldBan, Clock, Unlock } from 'lucide-react';

const blockList = [
  { ip: '203.0.113.88', reason: 'SSH Brute Force', blockedAt: '14:31:45', expires: '24h', duration: '24 hours' },
  { ip: '198.51.100.42', reason: 'Port Scan', blockedAt: '14:32:01', expires: '1h', duration: '1 hour' },
  { ip: '8.8.8.8', reason: 'Manual Block', blockedAt: '10:15:00', expires: 'Permanent', duration: 'indefinite' }
];

export default function IPSActions() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Intrusion Prevention System (IPS)</h1>
        <div className="flex items-center">
          <span className="text-gray-400 mr-2 text-sm">Auto-Block:</span>
          <div className="w-10 h-5 rounded-full flex items-center p-1 cursor-pointer bg-cyan-500">
            <div className="w-3 h-3 rounded-full bg-white shadow-md transform translate-x-5"></div>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg">
        <div className="p-4 border-b border-gray-800 flex items-center text-red-500">
          <ShieldBan size={20} className="mr-2" /> 
          <h2 className="font-bold">Currently Blocked IPs</h2>
        </div>
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-5 py-3">IP Address</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Blocked At</th>
              <th className="px-5 py-3">Expires In</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {blockList.map((b, i) => (
              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                <td className="px-5 py-3 font-mono text-red-400 font-bold">{b.ip}</td>
                <td className="px-5 py-3">{b.reason}</td>
                <td className="px-5 py-3 font-mono text-xs">{b.blockedAt}</td>
                <td className="px-5 py-3 flex items-center">
                  <Clock size={14} className="mr-1 text-gray-500" />
                  {b.expires}
                </td>
                <td className="px-5 py-3">
                  <button className="flex items-center text-cyan-500 hover:text-cyan-400 font-bold text-xs uppercase bg-cyan-900/20 px-2 py-1 rounded">
                    <Unlock size={12} className="mr-1" /> Unblock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
