import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, CheckCircle2, Play, AlertCircle, Check, X, ShieldAlert, Cpu } from 'lucide-react';
import axios from 'axios';

export default function AdaptiveDefense() {
  const [recommendations, setRecommendations] = useState(null);
  const [shadowRules, setShadowRules] = useState([]);
  const [verificationInput, setVerificationInput] = useState({ pps_before: 850, pps_after: 12, min_reduction_pct: 90.0 });
  const [verificationResult, setVerificationResult] = useState(null);
  const [threatScore, setThreatScore] = useState(78);
  const [criticality, setCriticality] = useState('MEDIUM');
  const [newShadowIp, setNewShadowIp] = useState('192.168.1.180');

  useEffect(() => {
    fetchShadowRules();
    getRecommendation(threatScore, criticality);
  }, []);

  const fetchShadowRules = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/responses/shadow');
      setShadowRules(res.data.shadow_rules || []);
    } catch (err) {
      console.error(err);
    }
  };

  const getRecommendation = async (score, crit) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/responses/recommendations?threat_score=${score}&criticality=${crit}`);
      setRecommendations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addShadowRule = async () => {
    try {
      await axios.post('http://localhost:5000/api/responses/shadow', {
        target_ip: newShadowIp,
        target_port: 80,
        action: 'BLOCK'
      });
      fetchShadowRules();
    } catch (err) {
      console.error(err);
    }
  };

  const promoteShadowRule = async (rule_id) => {
    try {
      await axios.post('http://localhost:5000/api/responses/shadow/promote', { rule_id });
      fetchShadowRules();
    } catch (err) {
      console.error(err);
    }
  };

  const verifyResponse = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/responses/verify', verificationInput);
      setVerificationResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <ShieldCheck className="text-cyan-400" /> Adaptive Defense & Verification Center
        </h1>
        <p className="text-gray-400 text-sm">
          Response recommendation engine, non-blocking shadow rules evaluation, and closed-loop mitigation verification.
        </p>
      </div>

      {/* Grid: Recommendation Engine & Shadow Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommendation Engine */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu size={18} className="text-purple-400" /> Adaptive Response Policy Calculator
          </h2>
          <p className="text-xs text-gray-400">
            Calculates optimal defensive posture by weighing threat intensity against asset criticality.
          </p>

          <div className="space-y-3 bg-gray-950/50 p-4 rounded-lg border border-gray-800">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Threat Score: {threatScore}</label>
              <input 
                type="range" min="0" max="100" 
                value={threatScore}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setThreatScore(val);
                  getRecommendation(val, criticality);
                }}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Asset Criticality</label>
              <select 
                value={criticality}
                onChange={(e) => {
                  setCriticality(e.target.value);
                  getRecommendation(threatScore, e.target.value);
                }}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            {recommendations && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-xs space-y-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Recommended Action:</span>
                  <span className="font-bold text-cyan-300 px-2 py-0.5 bg-cyan-500/20 rounded font-mono">
                    {recommendations.recommended_action}
                  </span>
                </div>
                <div className="text-gray-300">{recommendations.reason}</div>
              </div>
            )}
          </div>
        </div>

        {/* Shadow Rules */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye size={18} className="text-amber-400" /> Active Shadow Rules
            </h2>
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
              NON-BLOCKING
            </span>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={newShadowIp} 
              onChange={(e) => setNewShadowIp(e.target.value)} 
              placeholder="Target IP" 
              className="flex-1 bg-gray-950 border border-gray-700 text-white text-xs px-3 py-1.5 rounded"
            />
            <button 
              onClick={addShadowRule} 
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded transition-colors"
            >
              Add Shadow Rule
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {shadowRules.map((rule, idx) => (
              <div key={idx} className="bg-gray-950/60 border border-gray-800 rounded-lg p-3 text-xs flex justify-between items-center">
                <div>
                  <div className="font-mono text-cyan-300 font-bold">{rule.rule_id}: {rule.target_ip}</div>
                  <div className="text-gray-400">Hits: {rule.matches} | Legitimate: {rule.legitimate_matches} | Mode: {rule.mode}</div>
                </div>
                {rule.mode === 'SHADOW' && (
                  <button 
                    onClick={() => promoteShadowRule(rule.rule_id)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors"
                  >
                    Promote Active
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mitigation Verification */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-400" /> Response Effectiveness Verification
        </h2>
        <p className="text-xs text-gray-400">
          Measures before-vs-after traffic throughput rates to empirically prove whether enforcement stopped the attack.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-950/50 p-4 rounded-lg border border-gray-800">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Pre-Mitigation PPS (packets/sec)</label>
            <input 
              type="number" 
              value={verificationInput.pps_before} 
              onChange={(e) => setVerificationInput({...verificationInput, pps_before: parseFloat(e.target.value)})}
              className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Post-Mitigation PPS (packets/sec)</label>
            <input 
              type="number" 
              value={verificationInput.pps_after} 
              onChange={(e) => setVerificationInput({...verificationInput, pps_after: parseFloat(e.target.value)})}
              className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded text-sm"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={verifyResponse}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded transition-colors"
            >
              Verify Mitigation Outcome
            </button>
          </div>
        </div>

        {verificationResult && (
          <div className={`p-4 rounded-lg border text-sm ${
            verificationResult.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Verification Outcome: {verificationResult.status}</span>
              <span className="font-mono text-lg font-bold">{verificationResult.effectiveness_pct}% Effectiveness</span>
            </div>
            <div className="text-xs">{verificationResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
