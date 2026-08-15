import { useState } from 'react';
import axios from 'axios';
import { Play, ShieldCheck, AlertCircle, Cpu, CheckCircle } from 'lucide-react';

export default function PolicySimulatorView() {
  const [ip, setIp] = useState('10.0.0.99');
  const [port, setPort] = useState('445');
  const [action, setAction] = useState('BLOCK');
  const [simulationResult, setSimulationResult] = useState(null);
  const [counterfactualResult, setCounterfactualResult] = useState(null);

  const handleSimulate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/simulation/simulate', {
        ip,
        port: parseInt(port) || null,
        action
      });
      setSimulationResult(res.data.simulation_result);
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };

  const handleCounterfactual = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/simulation/counterfactual', {
        incident_id: 'INC-1001',
        attacker_ip: ip
      });
      setCounterfactualResult(res.data);
    } catch (err) {
      console.error('Counterfactual failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cpu className="text-cyan-400" /> Policy Simulator & Counterfactual Defense
        </h1>
        <p className="text-gray-400 text-sm">Simulate rule impacts on historical traffic & evaluate 'What-If' defensive options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Simulator Form */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Play size={18} className="text-cyan-400" /> Dry-Run Policy Simulator
          </h2>
          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Target IP Address</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Target Port (Optional)</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Enforcement Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="BLOCK">BLOCK</option>
                <option value="RATE_LIMIT">RATE_LIMIT</option>
                <option value="QUARANTINE">QUARANTINE</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play size={16} /> Run Historical Simulation
            </button>
          </form>

          {simulationResult && (
            <div className="mt-6 p-4 bg-gray-900/90 border border-cyan-500/30 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Flows Analyzed:</span>
                <span className="font-mono text-white">{simulationResult.flows_analyzed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Would Block:</span>
                <span className="font-mono text-yellow-400">{simulationResult.would_block}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">False-Block Rate:</span>
                <span className="font-mono text-emerald-400">{simulationResult.false_block_rate}%</span>
              </div>
              <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                <span className="text-sm text-gray-300 font-medium">Recommendation:</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${simulationResult.recommendation === 'SAFE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400'}`}>
                  {simulationResult.recommendation}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Counterfactual Defense */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-cyan-400" /> Counterfactual 'What-If' Defense
          </h2>
          <p className="text-xs text-gray-400 mb-4">Compare defensive trade-offs between security mitigation & availability</p>
          
          <button
            onClick={handleCounterfactual}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm mb-4"
          >
            Evaluate Defense Options for {ip}
          </button>

          {counterfactualResult && (
            <div className="space-y-3">
              {counterfactualResult.options.map((opt, i) => (
                <div key={i} className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg">
                  <div className="flex items-center justify-between text-sm font-bold text-white">
                    <span>{opt.option}</span>
                    <span className="text-xs text-cyan-400 font-mono">Score: {opt.recommendation_score}/100</span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1">Security: {opt.security_impact}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Availability: {opt.availability_impact}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
