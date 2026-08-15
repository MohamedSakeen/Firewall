import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Plus, Shield, CheckCircle, RefreshCw, Cpu, Layers } from 'lucide-react';
import axios from 'axios';

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    ip: '', hostname: '', role: 'Workstation', criticality: 'MEDIUM', segment: 'INTERNAL', owner: 'IT'
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/assets');
      setAssets(res.data.assets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAsset.ip) return;
    try {
      await axios.post('http://localhost:5000/api/assets', newAsset);
      setShowAddModal(false);
      setNewAsset({ ip: '', hostname: '', role: 'Workstation', criticality: 'MEDIUM', segment: 'INTERNAL', owner: 'IT' });
      fetchAssets();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Server className="text-cyan-400" /> Asset Intelligence & Inventory
          </h1>
          <p className="text-gray-400 text-sm">
            Host criticality mapping, network segmentation, and asset security posture profiles.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Register Asset
        </button>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assets.map((asset, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-3 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-bold font-mono text-cyan-300">{asset.ip}</div>
                <div className="text-xs text-gray-400">{asset.hostname}</div>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                asset.criticality === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                asset.criticality === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {asset.criticality}
              </span>
            </div>

            <div className="space-y-1 text-xs border-t border-gray-800/80 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Role:</span>
                <span className="text-gray-200 font-medium">{asset.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Segment:</span>
                <span className="text-purple-300 font-mono">{asset.segment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Owner:</span>
                <span className="text-gray-300">{asset.owner}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-bold text-white">Register Asset Profile</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">IP Address</label>
                <input 
                  type="text" required placeholder="e.g. 10.0.0.50"
                  value={newAsset.ip} onChange={(e) => setNewAsset({...newAsset, ip: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 text-white rounded px-3 py-1.5 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Hostname</label>
                <input 
                  type="text" placeholder="e.g. app-worker-01"
                  value={newAsset.hostname} onChange={(e) => setNewAsset({...newAsset, hostname: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Role</label>
                <input 
                  type="text" placeholder="e.g. API Gateway"
                  value={newAsset.role} onChange={(e) => setNewAsset({...newAsset, role: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Criticality</label>
                <select 
                  value={newAsset.criticality} onChange={(e) => setNewAsset({...newAsset, criticality: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button 
                  type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 bg-gray-800 text-gray-300 text-sm font-medium rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-cyan-600 text-white text-sm font-medium rounded hover:bg-cyan-500"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
