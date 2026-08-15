import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Search } from 'lucide-react';
import { connectSocket } from '../services/socket';
import { fetchLiveTraffic } from '../services/api';

export default function PacketInspector() {
  const [packets, setPackets] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [search, setSearch] = useState('');
  const packetsRef = useRef([]);
  const MAX_PACKETS = 200;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const history = await fetchLiveTraffic();
        if (!mounted) return;
        const formatted = (history || []).map((p, idx) => ({
          id: idx + 1,
          time: p.time?.split('T')[1]?.slice(0, 12) || p.time || '',
          src: `${p.src_ip || '?'}:${p.src_port || ''}`,
          dst: `${p.dst_ip || '?'}:${p.dst_port || ''}`,
          proto: p.protocol || 'TCP',
          len: p.payload_len || 64,
          flags: p.tcp_flags ? String(p.tcp_flags) : 'SYN',
          score: p.score || 0
        })).reverse();
        packetsRef.current = formatted;
        setPackets(formatted);
      } catch {
        console.warn('Failed to fetch initial traffic history');
      }
    })();

    const socket = connectSocket();

    socket.on('packet', (data) => {
      if (isPaused) return;
      packetsRef.current = [data, ...packetsRef.current].slice(0, MAX_PACKETS);
      setPackets([...packetsRef.current]);
    });

    return () => {
      mounted = false;
      socket.off('packet');
    };
  }, [isPaused]);

  const filteredPackets = search
    ? packets.filter(p =>
        p.src?.includes(search) ||
        p.dst?.includes(search) ||
        p.proto?.toLowerCase().includes(search.toLowerCase())
      )
    : packets;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Live Packet Inspector</h1>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-500 font-mono">{packets.length} packets</div>
          <button onClick={() => setIsPaused(!isPaused)} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center ${isPaused ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30' : 'bg-orange-600/20 text-orange-500 hover:bg-orange-600/30'}`}>
            {isPaused ? <Play size={16} className="mr-2" /> : <Pause size={16} className="mr-2" />}
            {isPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search stream..." className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-64" />
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col font-mono">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800 sticky top-0 shadow">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Destination</th>
                <th className="px-4 py-2">Proto</th>
                <th className="px-4 py-2">Length</th>
                <th className="px-4 py-2">Flags</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackets.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-gray-600" colSpan={7}>Waiting for packets... (ensure sniffer is running)</td></tr>
              )}
              {filteredPackets.map((p, i) => (
                <tr key={p.id || i} className={`border-b border-gray-800 hover:bg-gray-800/50 text-xs ${(p.score || 0) > 80 ? 'bg-red-900/10 text-red-300' : (p.score || 0) > 50 ? 'bg-orange-900/10 text-orange-300' : ''}`}>
                  <td className="px-4 py-2 text-gray-500">{p.id}</td>
                  <td className="px-4 py-2">{p.time}</td>
                  <td className="px-4 py-2 text-blue-400">{p.src}</td>
                  <td className="px-4 py-2 text-cyan-400">{p.dst}</td>
                  <td className="px-4 py-2">{p.proto}</td>
                  <td className="px-4 py-2">{p.len}</td>
                  <td className="px-4 py-2">{p.flags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

