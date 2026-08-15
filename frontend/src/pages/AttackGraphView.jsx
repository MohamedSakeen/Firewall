import { useState, useEffect } from 'react';
import axios from 'axios';
import { Network, Server, Shield, ArrowRight } from 'lucide-react';

export default function AttackGraphView() {
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/incidents/INC-1001/graph');
      setGraphData(res.data);
    } catch (err) {
      console.error('Error fetching graph:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Network className="text-cyan-400" /> Interactive Attack Graph Topology
        </h1>
        <p className="text-gray-400 text-sm">Visualizing attacker pathways, targeted assets, and kill-chain stages</p>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Incident Topology Map ({graphData?.incident_id || 'INC-1001'})</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Nodes list */}
          {graphData?.nodes?.map((node) => (
            <div key={node.id} className="bg-gray-900/90 border border-cyan-500/30 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-3">
                {node.type === 'ATTACKER' && <Shield className="text-red-400" size={24} />}
                {node.type === 'STAGE' && <Network className="text-yellow-400" size={24} />}
                {node.type === 'ASSET' && <Server className="text-cyan-400" size={24} />}
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300">{node.type}</span>
                  <h3 className="text-sm font-bold text-white mt-1">{node.label}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-gray-700/50 pt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Attack Graph Relationships (Edges)</h3>
          <div className="space-y-2">
            {graphData?.edges?.map((edge, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs text-gray-300 bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-800">
                <span className="font-mono text-red-400">{edge.source}</span>
                <ArrowRight size={14} className="text-cyan-400" />
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">{edge.label}</span>
                <ArrowRight size={14} className="text-cyan-400" />
                <span className="font-mono text-emerald-400">{edge.target}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
