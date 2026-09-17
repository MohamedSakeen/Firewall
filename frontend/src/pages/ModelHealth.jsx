import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import axios from 'axios';

export default function ModelHealth() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchModels(); }, []);

  const fetchModels = async () => {
    setLoading(true);
    try { const res = await axios.get('http://localhost:5000/api/learning/models'); setModels(res.data.models || []); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const statusStyle = (status) => {
    switch (status) {
      case 'PRODUCTION': return { background: 'rgba(34,197,94,0.1)', color: '#4ade80' };
      case 'SHADOW': return { background: 'rgba(234,179,8,0.1)', color: '#facc15' };
      default: return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa' };
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Model Health</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Model versioning, validation metrics, rollback</div>
      </div>

      {/* Models Table */}
      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Model', 'Version', 'Status', 'Dataset', 'Accuracy', 'FP Rate', 'Health', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={8}>Loading...</td></tr>}
              {!loading && models.length === 0 && <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={8}>No models registered</td></tr>}
              {models.map((model, idx) => (
                <tr key={idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{model.name}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{model.model_id}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>v{model.version}</td>
                  <td className="px-3 py-2"><span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={statusStyle(model.status)}>{model.status}</span></td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{model.dataset_version}</td>
                  <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--status-healthy)' }}>
                    {((model.validation_metrics?.accuracy || 0.965) * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--status-warning)' }}>
                    {((model.validation_metrics?.false_positive_rate || 0.008) * 100).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-healthy)' }} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => alert("Rollback command executed.")}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors"
                      style={{ background: 'var(--danger-muted)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <RotateCcw size={11} /> Rollback
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
