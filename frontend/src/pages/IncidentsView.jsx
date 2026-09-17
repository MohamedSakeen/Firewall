import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock } from 'lucide-react';
import Pagination from '../components/ui/Pagination';
import ExportMenu from '../components/ui/ExportMenu';

export default function IncidentsView() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => { fetchIncidents(); }, []);

  const fetchIncidents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/incidents');
      const data = res.data.incidents || [];
      setIncidents(data);
      if (data.length > 0) selectIncident(data[0]);
    } catch (err) { console.error('Error fetching incidents:', err); }
  };

  const selectIncident = async (inc) => {
    setSelectedIncident(inc);
    try {
      const res = await axios.get(`http://localhost:5000/api/incidents/${inc.incident_id}/timeline`);
      setTimeline(res.data.timeline || []);
    } catch (err) { console.error('Error fetching timeline:', err); }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const pagedIncidents = incidents.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Header (Checklist Section 10) */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Incident List */}
        <div className="rounded overflow-hidden flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Active Incidents</span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{incidents.length} total</span>
          </div>

          <div className="p-2 space-y-2 flex-1 overflow-y-auto">
            {incidents.length === 0 && (
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
                  <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-primary)' }}>{inc.incident_id}</span>
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--color-threat)' }}>
                    Score {inc.threat_score}/100
                  </span>
                </div>
                <div className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Attacker: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{inc.attacker_ip}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Stage: <span style={{ color: 'var(--color-warning)' }}>{inc.current_stage}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 50 records/page Pagination (Checklist Section 12) */}
          <Pagination
            totalItems={incidents.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2 rounded p-4 flex flex-col" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          {selectedIncident ? (
            <div>
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{selectedIncident.incident_id}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Kill Chain: <span style={{ color: 'var(--color-warning)' }}>{selectedIncident.current_stage}</span>
                  </div>
                </div>
                <span className="inline-block text-[10px] font-medium font-mono px-2 py-0.5 rounded-[2px]" style={{ background: 'var(--accent-muted)', color: 'var(--color-primary)' }}>
                  {selectedIncident.status}
                </span>
              </div>

              <div className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Clock size={12} /> Forensic Timeline
              </div>

              <div className="relative ml-3 space-y-3" style={{ borderLeft: '2px solid var(--border-strong)' }}>
                {timeline.map((evt, i) => (
                  <div key={i} className="relative pl-4 pb-2">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
                    <div className="rounded p-2.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--color-primary)' }}>{evt.time_str}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{evt.evidence_id}</span>
                      </div>
                      <div className="text-xs font-medium mt-1 text-[var(--text-heading)]">{evt.event_type}</div>
                      <div className="text-[11px] mt-0.5 text-[var(--text-secondary)]">{evt.description}</div>
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
