import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, AlertTriangle, Cpu, Database, RefreshCw, CheckCircle, Lock } from 'lucide-react';
import axios from 'axios';

export default function BehaviorDashboard() {
  const [baselines, setBaselines] = useState([]);
  const [drifts, setDrifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [learningMode, setLearningMode] = useState('MONITORING');
  const [trustGateSample, setTrustGateSample] = useState({ anomaly_score: 0.12, threat_score: 15, is_quarantined: false });
  const [trustGateResult, setTrustGateResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [baseRes, driftRes] = await Promise.all([
        axios.get('http://localhost:5000/api/learning/baselines').catch(() => ({ data: { baselines: [] } })),
        axios.get('http://localhost:5000/api/learning/drift').catch(() => ({ data: { drift_events: [] } }))
      ]);
      setBaselines(baseRes.data.baselines || []);
      setDrifts(driftRes.data.drift_events || []);
    } catch (err) {
      console.error("Failed to load behavior data", err);
    } finally {
      setLoading(false);
    }
  };

  const testTrustGate = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/learning/trust-gate', trustGateSample);
      setTrustGateResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Activity className="text-cyan-400" /> Self-Learning & Behavioral Baselines
          </h1>
          <p className="text-gray-400 text-sm">
            Per-asset statistical learning profiles, trusted observation gate & concept drift detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs text-gray-400">Runtime Mode:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              learningMode === 'LEARNING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              learningMode === 'MONITORING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {learningMode}
            </span>
          </div>
          <button 
            onClick={fetchData} 
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-sm">Learned Asset Profiles</span>
            <Database className="text-cyan-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{baselines.length}</div>
          <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
            <CheckCircle size={12} /> Baseline Convergence 96%
          </span>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-sm">Concept Drifts</span>
            <AlertTriangle className="text-amber-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{drifts.length}</div>
          <span className="text-xs text-amber-400 mt-1 block">Pending validation</span>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-sm">Poisoning Defense</span>
            <Lock className="text-emerald-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">ACTIVE</div>
          <span className="text-xs text-gray-400 mt-1 block">Trusted Gate Enforced</span>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-sm">Baseline Schema</span>
            <Cpu className="text-purple-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-white mt-2">v1.4</div>
          <span className="text-xs text-purple-400 mt-1 block">Deterministic EWMA</span>
        </div>
      </div>

      {/* Asset Baselines Table */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database size={18} className="text-cyan-400" /> Per-Asset Learned Profiles
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/60 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Asset IP / Host</th>
                <th className="px-4 py-3">Role & Segment</th>
                <th className="px-4 py-3">Criticality</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Observations</th>
                <th className="px-4 py-3">Normal Services</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {baselines.map((b, idx) => (
                <motion.tr 
                  key={idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-mono font-medium text-cyan-300">
                    {b.asset_ip}
                    <div className="text-xs text-gray-400 font-sans">{b.hostname || 'Dynamic Host'}</div>
                  </td>
                  <td className="px-4 py-3">{b.role || 'Workstation'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      b.criticality === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      b.criticality === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {b.criticality}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400">
                    {(b.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 font-mono">{b.sample_count}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {(b.normal_services || []).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded">
                      {b.status || 'STABLE'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Gate Tester & Concept Drift Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trust Gate */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" /> Learning Trust Gate Evaluator
          </h2>
          <p className="text-gray-400 text-xs">
            Evaluates traffic samples against anti-poisoning constraints before accepting them into baseline calculations.
          </p>

          <div className="space-y-3 bg-gray-950/50 p-4 rounded-lg border border-gray-800">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Anomaly Score (0.0 - 1.0)</label>
              <input 
                type="number" step="0.05" min="0" max="1"
                value={trustGateSample.anomaly_score} 
                onChange={(e) => setTrustGateSample({...trustGateSample, anomaly_score: parseFloat(e.target.value)})}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Threat Score (0 - 100)</label>
              <input 
                type="number" min="0" max="100"
                value={trustGateSample.threat_score} 
                onChange={(e) => setTrustGateSample({...trustGateSample, threat_score: parseInt(e.target.value)})}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
              />
            </div>
            <button 
              onClick={testTrustGate}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Evaluate Trust Eligibility
            </button>

            {trustGateResult && (
              <div className={`p-3 rounded-lg border text-xs ${
                trustGateResult.is_trusted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <div className="font-bold mb-1">Gate Action: {trustGateResult.gate_action}</div>
                <div>Eligible for baseline training: {trustGateResult.is_trusted ? "YES" : "NO (Rejected to protect baseline)"}</div>
              </div>
            )}
          </div>
        </div>

        {/* Concept Drift Events */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" /> Detected Concept Drifts
          </h2>
          <p className="text-gray-400 text-xs">
            Legitimate long-term network changes flagged for administrator approval before promotion to production baseline.
          </p>

          <div className="space-y-3">
            {drifts.map((d, idx) => (
              <div key={idx} className="bg-gray-950/50 p-4 rounded-lg border border-amber-500/20 text-sm space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-cyan-300 font-bold">{d.asset_ip}</span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold">
                    {d.drift_type}
                  </span>
                </div>
                <p className="text-xs text-gray-300">{d.details}</p>
                <div className="flex justify-between items-center pt-2 border-t border-gray-800 text-xs">
                  <span className="text-gray-400">Action: {d.action_required}</span>
                  <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors font-medium">
                    Approve Baseline Drift
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
