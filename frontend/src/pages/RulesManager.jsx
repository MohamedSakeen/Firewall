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
        if (mounted) {
          console.warn('Failed to fetch rules');
          setFiles({});
        }
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

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Rules & Policies Manager</h1>
        <div className="flex space-x-2">
          <button className="bg-gray-800 text-gray-200 px-4 py-2 rounded-md text-sm flex items-center hover:bg-gray-700">
            <Upload size={16} className="mr-2" /> Import
          </button>
          <button className="bg-gray-800 text-gray-200 px-4 py-2 rounded-md text-sm flex items-center hover:bg-gray-700">
            <Download size={16} className="mr-2" /> Export
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-lg flex-1 flex flex-col">
        <div className="flex border-b border-gray-800 bg-gray-900/50 px-2 pt-2">
          {['firewall', 'ids', 'ips', 'scoring'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              {tab.toUpperCase()} RULES
            </button>
          ))}
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded border border-gray-700">
              <div className="flex items-center space-x-2 ml-2">
                {Object.keys(files).map(fname => (
                  <button
                    key={fname}
                    onClick={() => setActiveFile(fname)}
                    className={`text-xs font-mono px-2 py-1 rounded ${
                      activeFile === fname
                        ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-800/30'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {fname}
                  </button>
                ))}
                {!loading && Object.keys(files).length === 0 && (
                  <span className="text-gray-500 text-sm">No rule files found</span>
                )}
              </div>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
            ) : (
              <textarea
                ref={editorRef}
                key={activeFile}
                className="w-full flex-1 bg-black border border-gray-700 rounded-md p-4 font-mono text-sm text-green-400 focus:outline-none focus:border-cyan-500 resize-none"
                defaultValue={serializedContent}
              />
            )}
            <div className="flex justify-end">
              <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center">
                <Save size={16} className="mr-2" /> Save Active Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
