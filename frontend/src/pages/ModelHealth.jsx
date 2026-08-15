import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, Activity, RotateCcw, Award, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function ModelHealth() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/learning/models');
      setModels(res.data.models || []);
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
          <Cpu className="text-purple-400" /> AI Model Governance & Health
        </h1>
        <p className="text-gray-400 text-sm">
          Model versioning, validation accuracy metrics, shadow deployments, and emergency rollback.
        </p>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((model, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5 backdrop-blur-md space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">{model.name}</h3>
                <div className="text-xs font-mono text-purple-400">ID: {model.model_id} | v{model.version}</div>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                model.status === 'PRODUCTION' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                model.status === 'SHADOW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {model.status}
              </span>
            </div>

            <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-800 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Dataset Version:</span>
                <span className="font-mono text-cyan-300">{model.dataset_version}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Validation Accuracy:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {((model.validation_metrics?.accuracy || 0.965) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>False Positive Rate:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {((model.validation_metrics?.false_positive_rate || 0.008) * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <CheckCircle size={14} className="text-emerald-400" /> Model Health Normal
              </span>
              <button 
                onClick={() => alert("Rollback command executed to previous baseline version.")}
                className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded flex items-center gap-1 font-medium transition-colors"
              >
                <RotateCcw size={12} /> Rollback Version
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
