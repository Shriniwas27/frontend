import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Clock3, Cloud, Server, Settings2, XCircle } from 'lucide-react';
import { getAgentState } from '../api';

const InfoRow = ({ label, value, isDark }) => (
  <div className={`flex items-center justify-between py-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
    <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
    <span className={`text-sm font-medium text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{value || 'N/A'}</span>
  </div>
);

const MetricBlock = ({ title, metrics, isDark }) => (
  <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
    <h4 className={`text-xs font-black uppercase tracking-wider mb-3 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}>{title}</h4>
    <div className="space-y-1.5">
      {Object.entries(metrics || {}).map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4">
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{k.replaceAll('_', ' ')}</span>
          <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{String(v)}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function AgentDetailsModal({ isOpen, onClose, onEditConfiguration, service, theme }) {
  const isDark = theme === 'dark';
  const [stateData, setStateData] = useState(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [stateError, setStateError] = useState(null);

  const agentLookupId = service?.agentId || service?.id;

  const fetchState = async () => {
    if (!agentLookupId) return;
    try {
      setIsLoadingState(true);
      setStateError(null);
      const res = await getAgentState(agentLookupId);
      if (res.data?.success) {
        setStateData(res.data.data || null);
      } else {
        setStateData(null);
      }
    } catch (err) {
      setStateError(err?.response?.data?.detail || err?.message || 'Failed to load state');
      setStateData(null);
    } finally {
      setIsLoadingState(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !agentLookupId) return;

    fetchState();
    const timer = window.setInterval(fetchState, 12000);
    return () => window.clearInterval(timer);
  }, [isOpen, agentLookupId]);

  const recentLogs = useMemo(() => {
    const logs = stateData?.state?.recent_error_logs;
    if (!Array.isArray(logs)) return [];
    return logs;
  }, [stateData]);

  if (!isOpen || !service) return null;

  return (
    <div className={`w-full h-full rounded-2xl border overflow-hidden flex flex-col ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-dark-border bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Agent Detailed View</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {service.agentName || 'Agent'} · {service.microserviceName || 'Service'} · {service.gcpProject || 'Project'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEditConfiguration}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isDark ? 'bg-emerald-accent text-dark-bg' : 'bg-google-blue text-white'}`}
            >
              <Settings2 className="w-4 h-4" /> Edit Configuration
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <XCircle className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col lg:flex-row">
            <div className={`w-full lg:w-2/5 border-r p-5 overflow-y-auto ${isDark ? 'border-dark-border bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Current Live Logs</h3>
              </div>

              {isLoadingState && (
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Refreshing state...</p>
              )}

              {stateError && (
                <div className="text-xs font-semibold text-rose-500 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 mb-3">
                  {stateError}
                </div>
              )}

              <div className="space-y-2">
                {recentLogs.length > 0 ? (
                  recentLogs.map((entry, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border font-mono text-xs ${isDark ? 'bg-dark-card border-dark-border text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                      <div className="text-gray-500 mb-1">[{stateData?.timestamp || 'live'}]</div>
                      <div>{typeof entry === 'string' ? entry : JSON.stringify(entry)}</div>
                    </div>
                  ))
                ) : (
                  <div className={`text-xs p-3 rounded-lg border ${isDark ? 'bg-dark-card border-dark-border text-gray-500' : 'bg-white border-gray-200 text-gray-500'}`}>
                    No recent error logs available.
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-3/5 p-5 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bot className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Agent State</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricBlock title="Traffic" metrics={stateData?.state?.traffic} isDark={isDark} />
                  <MetricBlock title="Infrastructure" metrics={stateData?.state?.infrastructure} isDark={isDark} />
                  <MetricBlock title="Network" metrics={stateData?.state?.network} isDark={isDark} />
                  <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider mb-3 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}>Snapshot</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Timestamp</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{stateData?.timestamp || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Project</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{stateData?.project || service.gcpProject || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Service</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{stateData?.service || service.microserviceName || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock3 className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Agent Configuration (View Only)</h3>
                </div>

                <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <InfoRow label="Agent Name" value={service.agentName} isDark={isDark} />
                  <InfoRow label="Agent ID" value={service.agentId} isDark={isDark} />
                  <InfoRow label="Project" value={service.gcpProject} isDark={isDark} />
                  <InfoRow label="Service" value={service.microserviceName} isDark={isDark} />
                  <InfoRow label="Location" value={service.gcpLocation} isDark={isDark} />
                  <InfoRow label="Activity Window" value={service.activityWindow} isDark={isDark} />
                  <InfoRow label="Start Time" value={service.startTime} isDark={isDark} />
                  <InfoRow label="End Time" value={service.endTime} isDark={isDark} />
                  <InfoRow label="Mode" value={service.operationMode} isDark={isDark} />
                  <InfoRow label="Notification Email" value={service.notifications?.email || service.email} isDark={isDark} />
                  <InfoRow label="Restriction" value={service.notifications?.restriction || service.restriction} isDark={isDark} />
                </div>

                <div className={`mt-3 rounded-xl p-4 border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-xs font-black uppercase tracking-wider mb-3 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}>Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className={`p-2 rounded ${service.permissions?.restartService ? 'bg-emerald-500/20 text-emerald-500' : 'bg-gray-400/10 text-gray-500'}`}>Restart Service: {service.permissions?.restartService ? 'Enabled' : 'Disabled'}</div>
                    <div className={`p-2 rounded ${service.permissions?.rollbackVersion ? 'bg-emerald-500/20 text-emerald-500' : 'bg-gray-400/10 text-gray-500'}`}>Rollback Version: {service.permissions?.rollbackVersion ? 'Enabled' : 'Disabled'}</div>
                    <div className={`p-2 rounded ${service.permissions?.horizontalScaling ? 'bg-emerald-500/20 text-emerald-500' : 'bg-gray-400/10 text-gray-500'}`}>Horizontal Scaling: {service.permissions?.horizontalScaling ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
