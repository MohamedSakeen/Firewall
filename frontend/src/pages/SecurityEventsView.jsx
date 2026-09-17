import { useState, useEffect } from 'react';
import { Filter, RefreshCw, Info } from 'lucide-react';
import axios from 'axios';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

const severityStyle = (sev) => {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL': return { background: 'rgba(239,68,68,0.15)', color: 'var(--color-threat)' };
    case 'HIGH': return { background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' };
    case 'MEDIUM': return { background: 'rgba(245,158,11,0.10)', color: 'var(--color-warning)' };
    case 'LOW': return { background: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)' };
    default: return { background: 'rgba(107,114,128,0.15)', color: 'var(--text-secondary)' };
  }
};

export default function SecurityEventsView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1);
    fetchEvents();
  }, [sourceFilter, severityFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/security-events';
      const params = new URLSearchParams();
      if (sourceFilter) params.append('source', sourceFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await axios.get(url);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to load security events", err);
    } finally {
      setLoading(false);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const pagedEvents = events.slice(startIndex, startIndex + pageSize);

  const selectStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '12px', padding: '3px 8px', outline: 'none',
  };

  return (
    <div className="space-y-3">
      {/* Header (Checklist Section 10) */}
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
            onClick={fetchEvents}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            title="Refresh events"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between rounded px-3 py-2" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Source:</span>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={selectStyle}>
              <option value="">ALL</option>
              <option value="anomaly">ANOMALY</option>
              <option value="ids">IDS</option>
              <option value="firewall">FIREWALL</option>
              <option value="ips">IPS</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Severity:</span>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={selectStyle}>
              <option value="">ALL</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{events.length} events</span>
      </div>

      {/* Table */}
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
              {pagedEvents.map((evt, idx) => {
                const sev = severityStyle(evt.severity);
                return (
                  <tr
                    key={evt.event_id || (startIndex + idx)}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-primary)' }}>{evt.event_id}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{evt.time_str || '—'}</td>
                    <td className="px-3 py-2">
                      <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{evt.event_type}</div>
                      <div className="text-[10px]" style={{ color: 'var(--color-primary)' }}>{evt.detector}</div>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{evt.source_ip}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{evt.destination_ip}:{evt.destination_port}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={sev}>{evt.severity}</span>
                    </td>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{evt.threat_score}</td>
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
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 50 records/page Pagination (Checklist Section 12) */}
        <Pagination
          totalItems={events.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Evidence Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded space-y-3 p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)' }}>
            <div className="flex justify-between items-start pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Event Evidence</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-primary)' }}>{selectedEvent.event_id} — {selectedEvent.event_type}</div>
              </div>
              <span className="text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-[2px]" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-primary)' }}>
                {selectedEvent.source_category}
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
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono rounded p-2" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <div>Source: <span style={{ color: 'var(--text-primary)' }}>{selectedEvent.source_ip}</span></div>
                <div>Target: <span style={{ color: 'var(--text-primary)' }}>{selectedEvent.destination_ip}:{selectedEvent.destination_port}</span></div>
                <div>Anomaly: <span style={{ color: 'var(--color-warning)' }}>{selectedEvent.anomaly_score}</span></div>
                <div>Confidence: <span style={{ color: 'var(--color-success)' }}>{selectedEvent.confidence * 100}%</span></div>
              </div>

              <div className="rounded p-2 flex justify-between items-center" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Recommended:</span>
                <span className="font-medium font-mono" style={{ color: 'var(--color-primary)' }}>{selectedEvent.recommended_action}</span>
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
