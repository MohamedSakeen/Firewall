import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock } from 'lucide-react';

export default function IncidentsView() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);

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

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Incidents</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Correlated attack stories & kill-chain progression</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Incident List */}
        <div className="rounded p-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Active Incidents</div>
          <div className="space-y-2">
            {incidents.map((inc) => (
              <div
                key={inc.incident_id}
                onClick={() => selectIncident(inc)}
                className="rounded p-3 cursor-pointer transition-colors"
                style={{
                  background: selectedIncident?.incident_id === inc.incident_id ? 'var(--accent-muted)' : 'var(--bg-inset)',
                  border: `1px solid ${selectedIncident?.incident_id === inc.incident_id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>{inc.incident_id}</span>
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                    Score {inc.threat_score}/100
                  </span>
                </div>
                <div className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Attacker: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{inc.attacker_ip}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Stage: <span style={{ color: 'var(--status-warning)' }}>{inc.current_stage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2 rounded p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
          {selectedIncident ? (
            <div>
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{selectedIncident.incident_id}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Kill Chain: <span style={{ color: 'var(--status-warning)' }}>{selectedIncident.current_stage}</span>
                  </div>
                </div>
                <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {selectedIncident.status}
                </span>
              </div>

              <div className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Clock size={12} /> Forensic Timeline
              </div>

              <div className="relative ml-3" style={{ borderLeft: '2px solid var(--border-strong)' }}>
                {timeline.map((evt, i) => (
                  <div key={i} className="relative pl-4 pb-4">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    <div className="rounded p-2.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>{evt.time_str}</span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{evt.evidence_id}</span>
                      </div>
                      <div className="text-xs font-medium mt-1" style={{ color: 'var(--text-heading)' }}>{evt.event_type}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{evt.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>Select an incident to view timeline</div>
          )}
        </div>
      </div>
    </div>
  );
}
