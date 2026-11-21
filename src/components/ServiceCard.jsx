import React from 'react';
import { Globe, Settings2, Trash2, GitBranch, ExternalLink } from 'lucide-react';

const ServiceCard = ({ 
  id,
  microserviceName, 
  gcpProject,
  status, 
  agentName, 
  agentId,
  repoUrl,
  githubRepo,
  deployedUrl,
  consoleUrl,
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
  const linkedRepoUrl = repoUrl || githubRepo?.repo_url;
  const repoDisplayName = githubRepo?.repo || (linkedRepoUrl ? linkedRepoUrl.replace('https://github.com/', '') : '');
  
  return (
    <div className={`border rounded-xl p-5 transition-all flex flex-col gap-4 relative overflow-hidden group ${
      theme === 'dark' ? 'bg-dark-card border-dark-border hover:border-gray-600' : 'ui-card-soft ui-card-soft-hover'
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
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {linkedRepoUrl && (
                <a
                  href={linkedRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View GitHub Repository"
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-800/90 text-emerald-accent hover:bg-gray-700 hover:text-emerald-300'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <GitBranch className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[130px]">{repoDisplayName}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                </a>
              )}
              {deployedUrl && (
                <a
                  href={deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open live deployed Cloud Run URL"
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    theme === 'dark'
                      ? 'bg-sky-950/60 text-sky-400 border border-sky-800/60 hover:bg-sky-900/60 hover:text-sky-300'
                      : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live App</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                </a>
              )}
            </div>
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
        {deployedUrl && (
          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open Live Deployed App in new tab"
            className={`px-3 h-9 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              theme === 'dark'
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Visit App
          </a>
        )}
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
