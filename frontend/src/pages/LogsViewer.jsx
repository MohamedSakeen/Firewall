import { useState, useEffect, useRef } from 'react';
import { Terminal, Search } from 'lucide-react';
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
    case 'error': return 'text-red-500';
    case 'warn': return 'text-yellow-400';
    case 'block': return 'text-red-400';
    default: return 'text-blue-400';
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

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">System Audit Logs</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search log output..."
              className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-md pl-8 pr-3 py-1 focus:outline-none focus:border-cyan-500 w-56"
            />
          </div>
          <span className="text-xs text-gray-500 font-mono">{filteredLogs.length} lines</span>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-gray-800 bg-gray-900/50 p-1.5 rounded-t-lg">
        {['all', 'alerts', 'blocked', 'ids', 'ips', 'firewall', 'threat_score'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              activeCategory === cat 
                ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/50 font-bold' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-black border border-gray-800 rounded-b-xl overflow-hidden flex flex-col shadow-2xl relative">
        <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center px-4 border-b border-gray-700 z-10">
          <Terminal size={14} className="text-gray-400 mr-2" />
          <span className="text-gray-400 text-xs font-mono">tail -f /backend/logs/{activeCategory}.log</span>
        </div>
        <div ref={scrollRef} className="p-4 pt-10 font-mono text-sm text-gray-300 overflow-y-auto w-full h-full whitespace-pre-wrap">
          {filteredLogs.length === 0 && (
            <span className="text-gray-600">No log entries found for this filter.</span>
          )}
          {filteredLogs.map((log, i) => (
            <div key={i} className="py-0.5 border-b border-gray-900/50 hover:bg-gray-900/30 text-xs">
              <span className="text-gray-600 mr-2">[{log.category.toUpperCase()}]</span>
              <span className={levelColor(log.level)}>[{log.level.toUpperCase()}]</span> {log.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

