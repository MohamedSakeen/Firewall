import { useState, useEffect, useCallback } from 'react';
import { Filter, RefreshCw, Info } from 'lucide-react';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';
import { fetchSecurityEvents } from '../services/api';
import { connectSocket } from '../services/socket';

const severityStyle = (sev) => {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL': return { background: 'rgba(239,68,68,0.15)', color: 'var(--color-threat)' };
    case 'HIGH': return { background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' };
    case 'MEDIUM': return { background: 'rgba(245,158,11,0.10)', color: 'var(--color-warning)' };
    case 'LOW': return { background: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)' };
    default: return { background: 'rgba(107,114,128,0.15)', color: 'var(--text-secondary)' };
  }
};

const confidenceLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : '—';

export default function SecurityEventsView() {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const loadEvents = useCallback(async () => {
    try {
      const params = {};
      if (sourceFilter) params.source = sourceFilter;
      if (severityFilter) params.severity = severityFilter;
      const data = await fetchSecurityEvents(params);
      setEvents(Array.isArray(data?.events) ? data.events : []);
      setError(null);
    } catch {
      setError('Unable to load security events');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, severityFilter]);

  const loadOptions = useCallback(async () => {
    try {
      const data = await fetchSecurityEvents();
      setAllEvents(Array.isArray(data?.events) ? data.events : []);
    } catch {
      setAllEvents([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadEvents, 0);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  useEffect(() => {
    const timer = setTimeout(loadOptions, 0);
    const socket = connectSocket();
    const onCreated = () => { loadOptions(); loadEvents(); };
    socket.on('security_event.created', onCreated);
    return () => { clearTimeout(timer); socket.off('security_event.created', onCreated); };
  }, [loadOptions, loadEvents]);

  const sourceOptions = [...new Set(allEvents.map(e => e.source_category).filter(Boolean))].sort();
  const severityOptions = [...new Set(allEvents.map(e => e.severity).filter(Boolean))].sort();

  const startIndex = (currentPage - 1) * pageSize;
  const pagedEvents = events.slice(startIndex, startIndex + pageSize);

  const selectStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '12px', padding: '3px 8px', outline: 'none',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Security Events</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Unified telemetry: IDS, anomaly, and firewall events</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename="valaiaran-security-events"
            data={events}
            currentPageData={pagedEvents}
            columns={[
              { key: 'event_id', label: 'Event ID' },
              { key: 'time_str', label: 'Timestamp' },
              { key: 'event_type', label: 'Event Type' },
              { key: 'detector', label: 'Detector' },
              { key: 'source_ip', label: 'Source IP' },
              { key: 'destination_ip', label: 'Destination IP' },
              { key: 'destination_port', label: 'Port' },
              { key: 'severity', label: 'Severity' },
              { key: 'threat_score', label: 'Threat Score' },
            ]}
          />

          <button
            onClick={() => { setLoading(true); loadEvents(); loadOptions(); }}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            title="Refresh events"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="flex items-center justify-between rounded px-3 py-2" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Source:</span>
            <select
              value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value); setCurrentPage(1); setLoading(true); }}
              style={selectStyle}
            >
              <option value="">ALL</option>
              {sourceOptions.map(option => <option key={option} value={option}>{option.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Severity:</span>
            <select
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setCurrentPage(1); setLoading(true); }}
              style={selectStyle}
            >
              <option value="">ALL</option>
              {severityOptions.map(option => <option key={option} value={option}>{option.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{events.length} events</span>
      </div>

      <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Event ID', 'Time', 'Type / Detector', 'Source IP', 'Target', 'Severity', 'Score', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {loading && (
                <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={8}>Loading telemetry...</td></tr>
              )}
              {!loading && events.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }} colSpan={8}>No security events found</td></tr>
              )}
              {pagedEvents.map((evt, idx) => (
                <tr
                  key={evt.event_id || `event-${startIndex + idx}`}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-primary)' }}>{evt.event_id ?? '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{evt.time_str ?? evt.timestamp ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{evt.event_type ?? '—'}</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-primary)' }}>{evt.detector ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{evt.source_ip ?? '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                    {evt.destination_ip ? `${evt.destination_ip}${evt.destination_port !== null && evt.destination_port !== undefined ? `:${evt.destination_port}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={severityStyle(evt.severity)}>{evt.severity ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{evt.threat_score ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setSelectedEvent(evt)}
                      className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors ml-auto"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--color-primary)', fontFamily: 'var(--font-sans)' }}
                    >
                      <Info size={11} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          totalItems={events.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded space-y-3 p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)' }}>
            <div className="flex justify-between items-start pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Event Evidence</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-primary)' }}>{selectedEvent.event_id ?? '—'} — {selectedEvent.event_type ?? '—'}</div>
              </div>
              <span className="text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-[2px]" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-primary)' }}>
                {selectedEvent.source_category ?? '—'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="rounded p-2 space-y-1" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Evidence Telemetry:</div>
                {(selectedEvent.evidence || []).map((ev, i) => (
                  <div key={i} className="font-mono flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--color-primary)' }}>▸</span> {ev}
                  </div>
                ))}
                {(selectedEvent.evidence || []).length === 0 && (
                  <div style={{ color: 'var(--text-muted)' }}>No evidence recorded</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono rounded p-2" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <div>Source: <span style={{ color: 'var(--text-primary)' }}>{selectedEvent.source_ip ?? '—'}</span></div>
                <div>Target: <span style={{ color: 'var(--text-primary)' }}>{selectedEvent.destination_ip ? `${selectedEvent.destination_ip}${selectedEvent.destination_port !== null && selectedEvent.destination_port !== undefined ? `:${selectedEvent.destination_port}` : ''}` : '—'}</span></div>
                <div>Anomaly: <span style={{ color: 'var(--color-warning)' }}>{selectedEvent.anomaly_score ?? '—'}</span></div>
                <div>Confidence: <span style={{ color: 'var(--color-success)' }}>{confidenceLabel(selectedEvent.confidence)}</span></div>
              </div>

              <div className="rounded p-2 flex justify-between items-center" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Recommended:</span>
                <span className="font-medium font-mono" style={{ color: 'var(--color-primary)' }}>{selectedEvent.recommended_action ?? '—'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button onClick={() => setSelectedEvent(null)} className="px-3 py-1.5 text-xs font-medium rounded transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
