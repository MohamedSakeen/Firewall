import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Network } from 'lucide-react';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';
import { fetchIncidents, fetchIncidentTimeline } from '../services/api';
import { connectSocket } from '../services/socket';

const display = (value) => value === null || value === undefined || value === '' ? '—' : value;

export default function IncidentsView() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineError, setTimelineError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const loadTimeline = useCallback(async (incidentId) => {
    if (!incidentId) return;
    try {
      const data = await fetchIncidentTimeline(incidentId);
      setTimeline(Array.isArray(data?.timeline) ? data.timeline : []);
      setTimelineError(null);
    } catch (err) {
      setTimeline([]);
      setTimelineError(err?.response?.status === 404 ? 'Timeline unavailable for this incident' : 'Unable to load incident timeline');
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      const list = Array.isArray(data?.incidents) ? data.incidents : [];
      setIncidents(list);
      const requestedId = new URLSearchParams(window.location.search).get('incident') || localStorage.getItem('selectedIncidentId');
      const matching = list.find(inc => inc.incident_id === requestedId);
      if (matching) {
        setSelectedIncident(matching);
        await loadTimeline(matching.incident_id);
      }
      setError(null);
    } catch {
      setError('Unable to load incidents');
    } finally {
      setLoading(false);
    }
  }, [loadTimeline]);

  useEffect(() => {
    const timer = setTimeout(loadIncidents, 0);
    const socket = connectSocket();
    const onUpdated = (incident) => {
      loadIncidents();
      if (incident?.incident_id) loadTimeline(incident.incident_id);
    };
    socket.on('incident.updated', onUpdated);
    return () => { clearTimeout(timer); socket.off('incident.updated', onUpdated); };
  }, [loadIncidents, loadTimeline]);

  const selectIncident = (inc) => {
    setSelectedIncident(inc);
    localStorage.setItem('selectedIncidentId', inc.incident_id);
    loadTimeline(inc.incident_id);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const pagedIncidents = incidents.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">Incidents</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Correlated attack stories and kill-chain progression</p>
        </div>
        <ExportMenu
          filename="valaiaran-incidents"
          data={incidents}
          currentPageData={pagedIncidents}
          columns={[
            { key: 'incident_id', label: 'Incident ID' },
            { key: 'attacker_ip', label: 'Attacker IP' },
            { key: 'threat_score', label: 'Score' },
            { key: 'current_stage', label: 'Kill Chain Stage' },
            { key: 'status', label: 'Status' },
          ]}
        />
      </div>

      {error && (
        <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-threat)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Active Incidents</span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{incidents.length} total</span>
          </div>

          <div className="p-2 space-y-2 flex-1 overflow-y-auto">
            {loading && (
              <div className="text-center py-6 text-xs text-[var(--text-muted)]">Loading incidents...</div>
            )}
            {!loading && incidents.length === 0 && (
              <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                No active incidents recorded
              </div>
            )}
            {pagedIncidents.map((inc) => (
              <div
                key={inc.incident_id}
                onClick={() => selectIncident(inc)}
                className="rounded p-2.5 cursor-pointer transition-colors"
                style={{
                  background: selectedIncident?.incident_id === inc.incident_id ? 'var(--accent-muted)' : 'var(--bg-inset)',
                  border: `1px solid ${selectedIncident?.incident_id === inc.incident_id ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-primary)' }}>{display(inc.incident_id)}</span>
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--color-threat)' }}>
                    Score {display(inc.threat_score)}
                  </span>
                </div>
                <div className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Attacker: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{display(inc.attacker_ip)}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Stage: <span style={{ color: 'var(--color-warning)' }}>{display(inc.current_stage)}</span>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            totalItems={incidents.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>

        <div className="lg:col-span-2 rounded p-4 flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          {selectedIncident ? (
            <div>
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{display(selectedIncident.incident_id)}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Kill Chain: <span style={{ color: 'var(--color-warning)' }}>{display(selectedIncident.current_stage)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-[10px] font-medium font-mono px-2 py-0.5 rounded-[2px]" style={{ background: 'var(--accent-muted)', color: 'var(--color-primary)' }}>
                    {display(selectedIncident.status)}
                  </span>
                  <button
                    onClick={() => navigate(`/attack-graph?incident=${encodeURIComponent(selectedIncident.incident_id)}`)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--color-primary)', border: '1px solid var(--border-subtle)' }}
                  >
                    <Network size={12} /> View Graph
                  </button>
                </div>
              </div>

              <div className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Clock size={12} /> Forensic Timeline
              </div>

              {timelineError && (
                <div className="rounded px-3 py-2 mb-3 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--color-warning)' }}>
                  {timelineError}
                </div>
              )}

              <div className="relative ml-3 space-y-3" style={{ borderLeft: '2px solid var(--border-strong)' }}>
                {timeline.length === 0 && !timelineError && (
                  <div className="text-xs py-4" style={{ color: 'var(--text-muted)' }}>No timeline events available</div>
                )}
                {timeline.map((evt, i) => (
                  <div key={evt.evidence_id ?? `timeline-${i}`} className="relative pl-4 pb-2">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
                    <div className="rounded p-2.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--color-primary)' }}>{display(evt.time_str)}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{display(evt.evidence_id)}</span>
                      </div>
                      <div className="text-xs font-medium mt-1 text-[var(--text-heading)]">{display(evt.event_type)}</div>
                      <div className="text-[11px] mt-0.5 text-[var(--text-secondary)]">{display(evt.description)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-[var(--text-muted)]">Select an incident to view timeline</div>
          )}
        </div>
      </div>
    </div>
  );
}
