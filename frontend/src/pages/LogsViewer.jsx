import { useState, useEffect, useCallback } from 'react';
import { Search, Terminal } from 'lucide-react';
import { fetchLogs } from '../services/api';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

const levelColor = (level) => {
  switch (String(level ?? '').toUpperCase()) {
    case 'ERROR':
    case 'CRITICAL':
    case 'BLOCK':
      return 'var(--color-threat)';
    case 'WARN':
    case 'WARNING':
      return 'var(--color-warning)';
    case 'INFO':
      return 'var(--color-primary)';
    default:
      return 'var(--text-muted)';
  }
};

export default function LogsViewer() {
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState(['correlated']);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const pageSize = 50;

  const loadLogs = useCallback(async () => {
    try {
      const data = await fetchLogs();
      const allLines = [];
      const availableCategories = new Set(['correlated']);
      Object.entries(data || {}).forEach(([category, entries]) => {
        availableCategories.add(category);
        (Array.isArray(entries) ? entries : []).forEach((entry, idx) => {
          const item = entry && typeof entry === 'object' ? entry : {};
          allLines.push({
            id: `${category}-${item.timestamp ?? idx}`,
            timestamp: item.timestamp ?? null,
            level: item.level ?? null,
            category: item.category ?? category,
            message: item.message ?? (typeof entry === 'string' ? entry : null),
          });
        });
      });
      setLogs(allLines);
      setCategories(['all', ...[...availableCategories].sort()]);
      setError(null);
    } catch {
      setError('Unable to load system logs');
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(loadLogs, 0);
    const interval = setInterval(loadLogs, 8000);
    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, [loadLogs]);

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
    const matchesSearch = !search || String(log.message ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const startIndex = (currentPage - 1) * pageSize;
  const pageLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-3 h-full flex flex-col">
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
              { key: 'timestamp', label: 'Timestamp' },
              { key: 'category', label: 'Category' },
              { key: 'level', label: 'Level' },
              { key: 'message', label: 'Message' },
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

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

      <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center px-3 py-1.5 justify-between" style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center">
            <Terminal size={12} style={{ color: 'var(--text-muted)', marginRight: 6 }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>Log stream: {activeCategory}</span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Total {filteredLogs.length} events
          </span>
        </div>

        <div className="p-3 font-mono text-xs overflow-y-auto w-full flex-1" style={{ color: 'var(--text-secondary)' }}>
          {pageLogs.length === 0 && (
            <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No log entries matching query
            </div>
          )}
          {pageLogs.map((log, i) => (
            <div key={`${log.id}-${startIndex + i}`} className="py-1 flex items-start gap-2 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors px-1">
              <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                {log.timestamp ?? '—'}
              </span>
              <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                [{String(log.category ?? '—').toUpperCase()}]
              </span>
              <span className="text-[11px] font-mono shrink-0 font-medium" style={{ color: levelColor(log.level) }}>
                [{log.level ? String(log.level).toUpperCase() : '—'}]
              </span>
              <span className="break-all text-[var(--text-primary)]">{log.message ?? '—'}</span>
            </div>
          ))}
        </div>

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
