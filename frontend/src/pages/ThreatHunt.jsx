import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Terminal, ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function ThreatHunt() {
  const [srcIp, setSrcIp] = useState('');
  const [dstIp, setDstIp] = useState('');
  const [protocol, setProtocol] = useState('');
  const [minThreat, setMinThreat] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/threat-hunt/query', {
        src_ip: srcIp || null,
        dst_ip: dstIp || null,
        protocol: protocol || null,
        min_threat_score: parseInt(minThreat) || 0
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <Search className="text-cyan-400" /> Threat Hunting Query Engine
        </h1>
        <p className="text-gray-400 text-sm">
          Pivot across flow telemetry, threat scores, protocol indicators, and security incidents.
        </p>
      </div>

      {/* Query Builder */}
      <form onSubmit={handleSearch} className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
        <h2 className="text-md font-semibold text-white flex items-center gap-2">
          <Filter size={18} className="text-cyan-400" /> Multi-Attribute Flow Filter
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Source IP</label>
            <input 
              type="text" 
              placeholder="e.g. 192.168.1.105" 
              value={srcIp} 
              onChange={(e) => setSrcIp(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-800 text-white rounded px-3 py-1.5 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Destination IP</label>
            <input 
              type="text" 
              placeholder="e.g. 10.0.0.10" 
              value={dstIp} 
              onChange={(e) => setDstIp(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-800 text-white rounded px-3 py-1.5 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Protocol</label>
            <select 
              value={protocol} 
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded px-3 py-1.5 text-sm"
            >
              <option value="">ALL PROTOCOLS</option>
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Min Threat Score ({minThreat})</label>
            <input 
              type="range" min="0" max="100" 
              value={minThreat} 
              onChange={(e) => setMinThreat(e.target.value)}
              className="w-full accent-cyan-500 mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button" 
            onClick={() => { setSrcIp(''); setDstIp(''); setProtocol(''); setMinThreat(0); setResults(null); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Clear Filters
          </button>
          <button 
            type="submit" 
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            Run Threat Hunt Query
          </button>
        </div>
      </form>

      {/* Results Table */}
      {results && (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Terminal size={18} className="text-cyan-400" /> Matched Telemetry Flows ({results.total_matches})
            </h2>
            <span className="text-xs text-gray-400">Query Time: 1.2ms</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-800/60 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Flow ID</th>
                  <th className="px-4 py-3">Source IP</th>
                  <th className="px-4 py-3">Destination IP</th>
                  <th className="px-4 py-3">Port</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Threat Score</th>
                  <th className="px-4 py-3">Payload Bytes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {results.results.map((f, idx) => (
                  <motion.tr 
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3 text-cyan-400 font-bold">{f.flow_id}</td>
                    <td className="px-4 py-3 text-gray-200">{f.src_ip}</td>
                    <td className="px-4 py-3 text-gray-200">{f.dst_ip}</td>
                    <td className="px-4 py-3 text-amber-300">{f.dst_port}</td>
                    <td className="px-4 py-3">{f.protocol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        f.threat_score >= 70 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        f.threat_score >= 40 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {f.threat_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{f.bytes} B</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
