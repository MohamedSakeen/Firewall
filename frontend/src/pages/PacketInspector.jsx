import { useState } from 'react';
import { Play, Pause, Search } from 'lucide-react';

const mockPackets = [
  { id: 1, time: '14:32:01.123', src: '198.51.100.42:34212', dst: '10.0.0.15:443', proto: 'TCP', len: 1200, flags: 'PSH, ACK', score: 85 },
  { id: 2, time: '14:32:01.144', src: '10.0.0.15:443', dst: '198.51.100.42:34212', proto: 'TCP', len: 140, flags: 'ACK', score: 10 },
  { id: 3, time: '14:32:01.205', src: '192.168.1.100:5421', dst: '8.8.8.8:53', proto: 'UDP', len: 64, flags: 'none', score: 5 },
  { id: 4, time: '14:32:01.332', src: '203.0.113.88:51233', dst: '10.0.0.22:22', proto: 'TCP', len: 74, flags: 'SYN', score: 95 },
  { id: 5, time: '14:32:01.401', src: '10.0.0.50:443', dst: '185.199.108.7:44332', proto: 'TCP', len: 1400, flags: 'ACK', score: 2 },
];

export default function PacketInspector() {
  const [isPaused, setIsPaused] = useState(false);
  const [packets] = useState(mockPackets);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Live Packet Inspector</h1>
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsPaused(!isPaused)} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center ${isPaused ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30' : 'bg-orange-600/20 text-orange-500 hover:bg-orange-600/30'}`}>
            {isPaused ? <Play size={16} className="mr-2" /> : <Pause size={16} className="mr-2" />}
            {isPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="text" placeholder="Search stream..." className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-64" />
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col font-mono">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800 sticky top-0 shadow">
              <tr>
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Destination</th>
                <th className="px-4 py-2">Proto</th>
                <th className="px-4 py-2">Length</th>
                <th className="px-4 py-2">Flags</th>
                <th className="px-4 py-2">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {packets.map(p => (
                <tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-800/50 text-xs ${p.score > 80 ? 'bg-red-900/10 text-red-300' : p.score > 50 ? 'bg-orange-900/10 text-orange-300' : ''}`}>
                  <td className="px-4 py-2">{p.time}</td>
                  <td className="px-4 py-2">{p.src}</td>
                  <td className="px-4 py-2">{p.dst}</td>
                  <td className="px-4 py-2">{p.proto}</td>
                  <td className="px-4 py-2">{p.len}</td>
                  <td className="px-4 py-2">{p.flags}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5 mr-2">
                        <div className={`h-1.5 rounded-full ${p.score > 80 ? 'bg-red-500' : p.score > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{width: `${p.score}%`}}></div>
                      </div>
                      <span className="text-[10px]">{p.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
