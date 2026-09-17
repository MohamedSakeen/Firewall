import { useState, useEffect, useRef } from 'react';
import { Search, Terminal } from 'lucide-react';
import { fetchLogs } from '../services/api';

function parseLevel(line) {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('fail') || lower.includes('critical')) return 'error';
  if (lower.includes('warn')) return 'warn';
  if (lower.includes('blocked') || lower.includes('block')) return 'block';
  return 'info';
}

function levelColor(level) {
  switch (level) {
    case 'error': return 'var(--status-threat)';
    case 'warn': return 'var(--status-warning)';
    case 'block': return '#f87171';
    default: return 'var(--status-info)';
  }
}

export default function LogsViewer() {
  const [logs, setLogs] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const data = await fetchLogs();
        if (!mounted) return;
        const allLines = [];
        Object.entries(data).forEach(([category, lines]) => {
          lines.forEach(line => {
            allLines.push({ text: line, category, level: parseLevel(line) });
          });
        });
        setLogs(allLines.slice(-500));
      } catch {
        console.warn('Failed to fetch logs');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, activeCategory]);

  const filteredLogs = logs.filter(log => {
    const matchesCategory = activeCategory === 'all' || log.category === activeCategory;
    const matchesSearch = !search || log.text.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'alerts', 'blocked', 'ids', 'ips', 'firewall', 'threat_score'];

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>System Logs</div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
              className="text-xs rounded pl-7 pr-2 py-1"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', outline: 'none', width: 180 }}
            />
          </div>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{filteredLogs.length} lines</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-1 rounded" style={{ background: 'var(--bg-inset)' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-2.5 py-1 rounded text-xs font-mono transition-colors"
            style={{
              background: activeCategory === cat ? 'var(--accent-muted)' : 'transparent',
              color: activeCategory === cat ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: activeCategory === cat ? 600 : 400,
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Log output */}
      <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center px-3 py-1" style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
          <Terminal size={12} style={{ color: 'var(--text-muted)', marginRight: 6 }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>tail -f /backend/logs/{activeCategory}.log</span>
        </div>
        <div ref={scrollRef} className="p-3 font-mono text-xs overflow-y-auto w-full h-full" style={{ color: 'var(--text-secondary)' }}>
          {filteredLogs.length === 0 && (
            <span style={{ color: 'var(--text-muted)' }}>No log entries found for this filter.</span>
          )}
          {filteredLogs.map((log, i) => (
            <div key={i} className="py-0.5" style={{ borderBottom: '1px solid rgba(30,32,40,0.5)' }}>
              <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>[{log.category.toUpperCase()}]</span>
              <span style={{ color: levelColor(log.level) }}>[{log.level.toUpperCase()}]</span> {log.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
