import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Filter, RefreshCw, Info, Terminal, Layers } from 'lucide-react';
import axios from 'axios';

export default function SecurityEventsView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldAlert className="text-cyan-400" /> Unified Security Events Feed
          </h1>
          <p className="text-gray-400 text-sm">
            Unified telemetry stream incorporating signature IDS, heuristic anomaly detection, and stateful firewall events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchEvents}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400 uppercase font-semibold">Source:</span>
            <select 
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-white rounded px-3 py-1 text-xs"
            >
              <option value="">ALL SOURCES</option>
              <option value="anomaly">ANOMALY</option>
              <option value="ids">IDS</option>
              <option value="firewall">FIREWALL</option>
              <option value="ips">IPS</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase font-semibold">Severity:</span>
            <select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-white rounded px-3 py-1 text-xs"
            >
              <option value="">ALL SEVERITIES</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-gray-400 font-mono">Showing {events.length} unified events</span>
      </div>

      {/* Events Table */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/60 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Type / Detector</th>
                <th className="px-4 py-3">Source IP</th>
                <th className="px-4 py-3">Target IP & Port</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Threat Score</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {events.map((evt, idx) => (
                <motion.tr 
                  key={evt.event_id || idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-bold text-cyan-400">{evt.event_id}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{evt.time_str || '2026-08-15 22:30:00'}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-200">{evt.event_type}</div>
                    <div className="text-xs text-purple-400 font-sans">{evt.detector}</div>
                  </td>
                  <td className="px-4 py-3 text-cyan-300">{evt.source_ip}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {evt.destination_ip}:{evt.destination_port}
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      evt.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      evt.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-cyan-300">{evt.threat_score}</td>
                  <td className="px-4 py-3 font-sans">
                    <button 
                      onClick={() => setSelectedEvent(evt)}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs rounded transition-colors flex items-center gap-1 font-medium"
                    >
                      <Info size={12} /> Inspect Evidence
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal size={18} className="text-cyan-400" /> Event Evidence Inspector
                </h3>
                <div className="text-xs font-mono text-cyan-400">{selectedEvent.event_id} - {selectedEvent.event_type}</div>
              </div>
              <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono uppercase">
                {selectedEvent.source_category}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800 space-y-1">
                <div className="text-gray-400 font-semibold mb-1">Structured Evidence Telemetry:</div>
                {(selectedEvent.evidence || []).map((ev, i) => (
                  <div key={i} className="text-cyan-300 font-mono flex items-center gap-2">
                    <span className="text-cyan-500">▶</span> {ev}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono bg-gray-950/60 p-3 rounded-lg border border-gray-800 text-gray-300">
                <div>Source: <span className="text-cyan-300">{selectedEvent.source_ip}</span></div>
                <div>Target: <span className="text-cyan-300">{selectedEvent.destination_ip}:{selectedEvent.destination_port}</span></div>
                <div>Anomaly Score: <span className="text-amber-400 font-bold">{selectedEvent.anomaly_score}</span></div>
                <div>Confidence: <span className="text-emerald-400 font-bold">{selectedEvent.confidence * 100}%</span></div>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-lg flex justify-between items-center">
                <span className="text-gray-400">Recommended Action:</span>
                <span className="font-bold text-cyan-300 font-mono bg-cyan-500/20 px-2 py-0.5 rounded">
                  {selectedEvent.recommended_action}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-gray-800 text-gray-300 text-sm font-medium rounded hover:bg-gray-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
