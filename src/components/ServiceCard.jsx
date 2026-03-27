import React from 'react';
import { Globe, Settings2, Trash2 } from 'lucide-react';

const ServiceCard = ({ 
  id,
  microserviceName, 
  gcpProject,
  status, 
  agentName, 
  agentId,
  version = '1.0.0', 
  latency, 
  theme, 
  onAction 
}) => {
  const isOperational = status === 'Operational';
  const isDegraded = status === 'Degraded';
  const isDown = status === 'Down';
  const displayServiceName =
    typeof microserviceName === 'string' && microserviceName.includes('/services/')
      ? microserviceName.split('/services/').pop()
      : microserviceName;
  
  return (
    <div className={`border rounded-xl p-5 transition-all flex flex-col gap-4 relative overflow-hidden group ${
      theme === 'dark' ? 'bg-dark-card border-dark-border hover:border-gray-600' : 'bg-white border-gray-200 hover:border-google-blue/30 shadow-sm'
    }`}>
      <div className={`absolute top-0 right-0 p-1 px-3 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg transition-colors ${
        isOperational ? 'bg-emerald-accent/20 text-emerald-accent' : 
        isDegraded ? 'bg-amber-400/20 text-amber-400' : 'bg-rose-accent/20 text-rose-accent'
      }`}>
        {status}
      </div>
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Agent: <span className="text-emerald-accent font-bold">{agentName}</span>
            </p>
            <h4 className={`font-semibold mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{displayServiceName}</h4>
            <p className="text-xs text-gray-500 uppercase mt-0.5">Project: {gcpProject || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className={`w-2 h-2 rounded-full ${isOperational ? 'bg-emerald-accent' : isDegraded ? 'bg-amber-400' : 'bg-rose-accent'} ${!isDown ? 'agent-active' : ''}`}></div>
        <p className="text-[10px] text-gray-500 font-mono">{agentId}</p>
      </div>

      <div className="space-y-2 mt-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Latency</span>
          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{isDown ? '∞' : `${latency}`}</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div 
            className={`h-full transition-all duration-500 ${isOperational ? 'bg-emerald-accent' : isDegraded ? 'bg-amber-400' : 'bg-rose-accent'}`} 
            style={{ width: isDown ? '100%' : `${Math.min(100, Math.max(20, (200 - parseInt(latency || 0)) / 2))}%` }}
          ></div>
        </div>
      </div>

      <div className={`flex gap-2 mt-2 pt-4 border-t ${theme === 'dark' ? 'border-dark-border' : 'border-gray-100'}`}>
        <button 
          onClick={() => onAction('Configure')}
          className={`flex-1 h-9 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <Settings2 className="w-4 h-4" /> View Details
        </button>
        <button 
          onClick={() => onAction('Delete')}
          title="Delete Service"
          className={`px-3 h-9 rounded-lg flex items-center justify-center transition-colors ${
            theme === 'dark' ? 'bg-gray-800 hover:bg-rose-accent/20 hover:text-rose-accent text-gray-500' : 'bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-500'
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;
