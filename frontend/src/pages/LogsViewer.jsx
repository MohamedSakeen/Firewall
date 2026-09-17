import { useState, useEffect, useRef } from 'react';
import { Search, Terminal } from 'lucide-react';
import { fetchLogs } from '../services/api';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

function parseLevel(line) {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('fail') || lower.includes('critical')) return 'error';
  if (lower.includes('warn')) return 'warn';
  if (lower.includes('blocked') || lower.includes('block')) return 'block';
  return 'info';
}

function levelColor(level) {
  switch (level) {
    case 'error': return 'var(--color-threat)';
    case 'warn': return 'var(--color-warning)';
    case 'block': return 'var(--color-threat)';
    default: return 'var(--color-primary)';
  }
}

export default function LogsViewer() {
  const [logs, setLogs] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const data = await fetchLogs();
        if (!mounted) return;
        const allLines = [];
        Object.entries(data).forEach(([category, lines]) => {
          lines.forEach((line, idx) => {
            allLines.push({
              id: `${category}-${idx + 1}`,
              text: line,
              category,
              level: parseLevel(line),
              timestamp: new Date().toISOString(),
            });
          });
        });
        setLogs(allLines.slice(-1000));
      } catch {
        console.warn('Failed to fetch logs');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const filteredLogs = logs.filter(log => {
    const matchesCategory = activeCategory === 'all' || log.category === activeCategory;
    const matchesSearch = !search || log.text.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const startIndex = (currentPage - 1) * pageSize;
  const pageLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const categories = ['all', 'alerts', 'blocked', 'ids', 'ips', 'firewall', 'threat_score'];

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Header (Checklist Section 10) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">System Logs</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Audit trail, detection events, and daemon telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search logs..."
              className="text-xs rounded pl-7 pr-2 py-1 outline-none"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                width: 180,
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <ExportMenu
            filename={`valaiaran-logs-${activeCategory}`}
            data={filteredLogs}
            currentPageData={pageLogs}
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'level', label: 'Level' },
              { key: 'text', label: 'Message' },
              { key: 'timestamp', label: 'Timestamp' },
            ]}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-1 rounded" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className="px-2.5 py-1 rounded text-xs font-mono transition-colors"
            style={{
              background: activeCategory === cat ? 'var(--accent-muted)' : 'transparent',
              color: activeCategory === cat ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: activeCategory === cat ? 600 : 400,
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Log output */}
      <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center px-3 py-1.5 justify-between" style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center">
            <Terminal size={12} style={{ color: 'var(--text-muted)', marginRight: 6 }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>tail -f /backend/logs/{activeCategory}.log</span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Total {filteredLogs.length} events
          </span>
        </div>

        <div ref={scrollRef} className="p-3 font-mono text-xs overflow-y-auto w-full flex-1" style={{ color: 'var(--text-secondary)' }}>
          {pageLogs.length === 0 && (
            <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No log entries matching query
            </div>
          )}
          {pageLogs.map((log, i) => (
            <div key={i} className="py-1 flex items-start gap-2 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors px-1">
              <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0 select-none">
                {String(startIndex + i + 1).padStart(4, '0')}
              </span>
              <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                [{log.category.toUpperCase()}]
              </span>
              <span className="text-[11px] font-mono shrink-0 font-medium" style={{ color: levelColor(log.level) }}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="break-all text-[var(--text-primary)]">
                {log.text}
              </span>
            </div>
          ))}
        </div>

        {/* 50 records/page Pagination (Checklist Section 12) */}
        <Pagination
          totalItems={filteredLogs.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
