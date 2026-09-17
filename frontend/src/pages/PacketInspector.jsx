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
          score: p.score || 0,
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

    return () => { mounted = false; socket.off('packet'); };
  }, [isPaused]);

  const filteredPackets = search
    ? packets.filter(p =>
        p.src?.includes(search) || p.dst?.includes(search) || p.proto?.toLowerCase().includes(search.toLowerCase())
      )
    : packets;

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Packet Inspector</div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{packets.length} packets</span>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors"
            style={{
              background: isPaused ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              color: isPaused ? 'var(--status-healthy)' : 'var(--status-warning)',
            }}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search..."
              className="text-xs rounded pl-7 pr-2 py-1"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', outline: 'none', width: 180 }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="sticky top-0" style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)', zIndex: 1 }}>
                {['#', 'Time', 'Source', 'Destination', 'Proto', 'Length', 'Flags'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredPackets.length === 0 && (
                <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={7}>Waiting for packets...</td></tr>
              )}
              {filteredPackets.map((p, i) => (
                <tr
                  key={p.id || i}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: (p.score || 0) > 80 ? 'rgba(239,68,68,0.04)' : (p.score || 0) > 50 ? 'rgba(245,158,11,0.04)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = (p.score || 0) > 80 ? 'rgba(239,68,68,0.04)' : (p.score || 0) > 50 ? 'rgba(245,158,11,0.04)' : 'transparent';
                  }}
                >
                  <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{p.id}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{p.time}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--status-info)' }}>{p.src}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>{p.dst}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{p.proto}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{p.len}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{p.flags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
