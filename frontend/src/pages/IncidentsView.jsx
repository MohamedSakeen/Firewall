import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Cpu, AlertTriangle, Layers, Clock } from 'lucide-react';

export default function IncidentsView() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/incidents');
      const data = res.data.incidents || [];
      setIncidents(data);
      if (data.length > 0) {
        selectIncident(data[0]);
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
    }
  };

  const selectIncident = async (inc) => {
    setSelectedIncident(inc);
    try {
      const res = await axios.get(`http://localhost:5000/api/incidents/${inc.incident_id}/timeline`);
      setTimeline(res.data.timeline || []);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-cyan-400" /> Correlated Security Incidents
          </h1>
          <p className="text-gray-400 text-sm">Attack Story correlation & kill-chain stage progression</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" /> Active Incidents
          </h2>
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.incident_id}
                onClick={() => selectIncident(inc)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedIncident?.incident_id === inc.incident_id ? 'bg-cyan-500/10 border-cyan-500' : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400">{inc.incident_id}</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-500/20 text-red-400 border border-red-500/30">
                    Threat {inc.threat_score}/100
                  </span>
                </div>
                <div className="text-sm text-gray-300 mt-2">Attacker: <span className="font-mono text-white">{inc.attacker_ip}</span></div>
                <div className="text-xs text-gray-400 mt-1">Stage: <span className="text-yellow-400 font-medium">{inc.current_stage}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Incident Details & Story Timeline */}
        <div className="lg:col-span-2 bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
          {selectedIncident ? (
            <div>
              <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedIncident.incident_id}</h3>
                  <p className="text-sm text-gray-400">Kill Chain Progression: <span className="text-yellow-400 font-semibold">{selectedIncident.current_stage}</span></p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {selectedIncident.status}
                  </span>
                </div>
              </div>

              <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                <Clock size={18} className="text-cyan-400" /> Chronological Forensic Timeline
              </h4>

              <div className="relative border-l-2 border-cyan-500/30 ml-4 space-y-6">
                {timeline.map((evt, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border-4 border-gray-900"></div>
                    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-400">{evt.time_str}</span>
                        <span className="text-xs font-mono text-gray-400">{evt.evidence_id}</span>
                      </div>
                      <div className="text-sm font-medium text-white mt-1">{evt.event_type}</div>
                      <div className="text-xs text-gray-300 mt-1">{evt.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">Select an incident to view attack story timeline</div>
          )}
        </div>
      </div>
    </div>
  );
}
