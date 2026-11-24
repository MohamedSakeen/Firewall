import { useState, useEffect, useCallback } from 'react';
import { fetchModels } from '../services/api';

const display = (value) => value === null || value === undefined || value === '' ? '—' : value;

const formatPercent = (value, digits = 1) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
};

const statusColor = (status) => {
  switch (status) {
    case 'PRODUCTION': return '#4ade80';
    case 'SHADOW':
    case 'VALIDATED': return '#facc15';
    case 'DEVELOPMENT':
    case 'CANDIDATE': return '#60a5fa';
    case 'DEPRECATED': return '#f87171';
    default: return 'var(--text-muted)';
  }
};

export default function ModelHealth() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadModels = useCallback(async () => {
    try {
      const data = await fetchModels();
      setModels(Array.isArray(data?.models) ? data.models : []);
      setError(null);
    } catch {
      setError('Unable to load model health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadModels, 0);
    return () => clearTimeout(timer);
  }, [loadModels]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Model Health</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Model versioning, validation metrics, and lifecycle status</p>
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="rounded overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Model', 'Version', 'Status', 'Dataset', 'Accuracy', 'FP Rate', 'Health'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={7}>Loading...</td></tr>}
              {!loading && models.length === 0 && <tr><td className="px-3 py-6 text-center" style={{ color: 'var(--text-muted)' }} colSpan={7}>No models registered</td></tr>}
              {models.map((model) => (
                <tr key={model.model_id ?? model.name} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{display(model.name)}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{display(model.model_id)}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{model.version ? `v${model.version}` : '—'}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--bg-elevated)', color: statusColor(model.status) }}>
                      {display(model.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{display(model.dataset_version)}</td>
                  <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--status-healthy)' }}>{formatPercent(model.validation_metrics?.accuracy)}</td>
                  <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: 'var(--status-warning)' }}>{formatPercent(model.validation_metrics?.false_positive_rate, 2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: statusColor(model.status) }} />
                      <span className="text-[11px] font-mono" style={{ color: statusColor(model.status) }}>{display(model.status)}</span>
                    </div>
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
