import { useState, useEffect, useRef } from 'react';
import { Upload, Download, Save } from 'lucide-react';
import { fetchRules, saveRule } from '../services/api';

export default function RulesManager() {
  const [activeTab, setActiveTab] = useState('ids');
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState('');
  const editorRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) setLoading(true);
      try {
        const data = await fetchRules(activeTab);
        if (!mounted) return;
        setFiles(data);
        const names = Object.keys(data);
        if (names.length > 0 && !names.includes(activeFile)) {
          setActiveFile(names[0]);
        }
      } catch {
        if (mounted) { console.warn('Failed to fetch rules'); setFiles({}); }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!activeFile) return;
    try {
      const parsed = JSON.parse(editorRef.current?.value || '');
      await saveRule(activeTab, activeFile, parsed);
      alert('Saved successfully');
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  };

  const serializedContent = activeFile && files[activeFile]
    ? (typeof files[activeFile] === 'string' ? files[activeFile] : JSON.stringify(files[activeFile], null, 2))
    : '';

  const tabs = ['firewall', 'ids', 'ips', 'scoring'];

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rules Manager</div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
            <Upload size={12} /> Import
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        {/* Tabs */}
        <div className="flex px-1 pt-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {tab.toUpperCase()} RULES
            </button>
          ))}
        </div>

        {/* File selector */}
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
          {Object.keys(files).map(fname => (
            <button
              key={fname}
              onClick={() => setActiveFile(fname)}
              className="text-xs font-mono px-2 py-0.5 rounded transition-colors"
              style={{
                background: activeFile === fname ? 'var(--accent-muted)' : 'transparent',
                color: activeFile === fname ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {fname}
            </button>
          ))}
          {!loading && Object.keys(files).length === 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No rule files found</span>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 p-3">
          {loading ? (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <textarea
              ref={editorRef}
              key={activeFile}
              className="w-full h-full resize-none font-mono text-sm p-3 rounded"
              defaultValue={serializedContent}
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-strong)',
                color: 'var(--status-healthy)',
                outline: 'none',
                minHeight: 200,
              }}
            />
          )}
        </div>

        {/* Save */}
        <div className="px-3 py-2 flex justify-end" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Save size={12} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
