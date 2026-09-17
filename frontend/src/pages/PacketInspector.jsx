import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Search } from 'lucide-react';
import { connectSocket } from '../services/socket';
import { fetchLiveTraffic } from '../services/api';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

export default function PacketInspector() {
  const [packets, setPackets] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const packetsRef = useRef([]);
  const MAX_PACKETS = 500;

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

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const filteredPackets = search
    ? packets.filter(p =>
        p.src?.includes(search) || p.dst?.includes(search) || p.proto?.toLowerCase().includes(search.toLowerCase())
      )
    : packets;

  const startIndex = (currentPage - 1) * pageSize;
  const pagedPackets = filteredPackets.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header (Checklist Section 10) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Packet Inspector</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Deep packet telemetry, frame dissection, and protocol inspection</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[var(--text-muted)]">{packets.length} packets</span>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors"
            style={{
              background: isPaused ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              color: isPaused ? 'var(--color-success)' : 'var(--color-warning)',
              border: `1px solid ${isPaused ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            }}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              type="text"
              placeholder="Filter frames..."
              className="text-xs rounded pl-7 pr-2 py-1 outline-none font-mono"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: 160 }}
            />
          </div>

          <ExportMenu
            filename="valaiaran-packet-inspector"
            data={filteredPackets}
            currentPageData={pagedPackets}
            columns={[
              { key: 'id', label: 'Frame #' },
              { key: 'time', label: 'Time' },
              { key: 'src', label: 'Source' },
              { key: 'dst', label: 'Destination' },
              { key: 'proto', label: 'Protocol' },
              { key: 'len', label: 'Length' },
              { key: 'flags', label: 'Flags' },
            ]}
          />
        </div>
      </div>

      <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="sticky top-0" style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)', zIndex: 1 }}>
                {['#', 'Time', 'Source', 'Destination', 'Proto', 'Length', 'Flags'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredPackets.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-sm font-sans text-[var(--text-muted)]" colSpan={7}>Waiting for packets...</td></tr>
              )}
              {pagedPackets.map((p, i) => (
                <tr
                  key={p.id || (startIndex + i)}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: (p.score || 0) > 80 ? 'rgba(239,68,68,0.06)' : (p.score || 0) > 50 ? 'rgba(245,158,11,0.06)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = (p.score || 0) > 80 ? 'rgba(239,68,68,0.06)' : (p.score || 0) > 50 ? 'rgba(245,158,11,0.06)' : 'transparent';
                  }}
                >
                  <td className="px-3 py-1.5 text-[var(--text-muted)]">{p.id}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{p.time}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--color-primary)' }}>{p.src}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{p.dst}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{p.proto}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{p.len}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{p.flags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 50 records/page Pagination (Checklist Section 12) */}
        <Pagination
          totalItems={filteredPackets.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
