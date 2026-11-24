import { useState, useEffect, useRef } from 'react';
import { Upload, Save } from 'lucide-react';
import { fetchRules, saveRule } from '../services/api';
import ExportMenu from '../components/ui/ExportMenu';

export default function RulesManager() {
  const [activeTab, setActiveTab] = useState('ids');
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFile, setActiveFile] = useState('');
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchRules(activeTab);
        if (!mounted) return;
        setFiles(data);
        setActiveFile(prev => Object.keys(data).includes(prev) ? prev : (Object.keys(data)[0] || ''));
        setError(null);
      } catch {
        if (mounted) { setFiles({}); setActiveFile(''); setError('Unable to load rules'); }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeTab]);

  const handleTabClick = (tab) => {
    setLoading(true);
    setActiveTab(tab);
  };

  const handleSave = async () => {
    if (!activeFile) return;
    try {
      const parsed = JSON.parse(editorRef.current?.value || '');
      await saveRule(activeTab, activeFile, parsed);
      setError(null);
      alert('Saved configuration successfully');
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (editorRef.current && content) editorRef.current.value = content;
      } catch {
        alert('Failed to read imported file');
      }
    };
    reader.readAsText(file);
  };

  const activeContent = activeFile && files[activeFile] ? files[activeFile] : {};
  const serializedContent = activeFile && files[activeFile]
    ? (typeof files[activeFile] === 'string' ? files[activeFile] : JSON.stringify(files[activeFile], null, 2))
    : '';

  const exportData = Array.isArray(activeContent)
    ? activeContent
    : Object.entries(activeContent).map(([k, v]) => ({ key: k, value: typeof v === 'object' ? JSON.stringify(v) : v }));

  const tabs = ['firewall', 'ids', 'ips', 'scoring'];

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Rules Manager</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Signature definitions, Snort/Suricata syntax, and scoring rules</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json,.rules,.txt" style={{ display: 'none' }} />
          <button type="button" onClick={handleImportClick}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
            <Upload size={12} /> Import
          </button>
          <ExportMenu filename={`valaiaran-rules-${activeTab}-${activeFile || 'config'}`} data={exportData} />
        </div>
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex px-1 pt-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-muted)' }}
            >
              {tab.toUpperCase()} RULES
            </button>
          ))}
        </div>

        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
          {Object.keys(files).map(fname => (
            <button
              key={fname}
              onClick={() => setActiveFile(fname)}
              className="text-xs font-mono px-2 py-0.5 rounded transition-colors"
              style={{ background: activeFile === fname ? 'var(--accent-muted)' : 'transparent', color: activeFile === fname ? 'var(--color-primary)' : 'var(--text-muted)' }}
            >
              {fname}
            </button>
          ))}
          {!loading && Object.keys(files).length === 0 && <span className="text-xs text-[var(--text-muted)]">No rule files found</span>}
        </div>

        <div className="flex-1 p-3">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">Loading rules...</div>
          ) : (
            <textarea
              ref={editorRef}
              key={activeFile}
              className="w-full h-full resize-none font-mono text-xs p-3 rounded"
              defaultValue={serializedContent}
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--color-success)', outline: 'none', minHeight: 220 }}
            />
          )}
        </div>

        <div className="px-3 py-2 flex justify-end" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleSave}
            disabled={!activeFile}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Save size={12} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
