import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bot, Clock3, Loader2, RefreshCw, Settings2, XCircle } from 'lucide-react';
import { getAgentLogsStreamUrl, getAgentState } from '../api';

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

const MetricBlockLoading = ({ title, isDark }) => (
  <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
    <h4 className={`text-xs font-black uppercase tracking-wider mb-3 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}>{title}</h4>
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
    </div>
  </div>
);

export default function AgentDetailsModal({ isOpen, onClose, onEditConfiguration, service, theme }) {
  const isDark = theme === 'dark';
  const [stateData, setStateData] = useState(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [stateError, setStateError] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [lastStateUpdatedAt, setLastStateUpdatedAt] = useState(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(null);
  const isFetchingStateRef = useRef(false);
  const logsViewportRef = useRef(null);

  const agentLookupId = service?.agentId || service?.id;

  const fetchState = async (isManual = false) => {
    if (!agentLookupId) return;
    if (isFetchingStateRef.current) return;

    try {
      isFetchingStateRef.current = true;
      setIsLoadingState(true);
      if (isManual) {
        setStateError(null);
      }
      const res = await getAgentState(agentLookupId);
      if (res.data?.success) {
        const nextData = res.data.data || null;
        setStateData(nextData);

        const snapshotTimestamp = nextData?.timestamp ? new Date(nextData.timestamp) : null;
        const updateTime = snapshotTimestamp && !Number.isNaN(snapshotTimestamp.getTime())
          ? snapshotTimestamp
          : new Date();

        setLastStateUpdatedAt(updateTime);
        setSecondsSinceUpdate(0);
        setStateError(null);
      } else {
        setStateError('State response is missing expected payload');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load state';
      // Avoid surfacing noisy timeout text directly in the UI.
      if (String(msg).toLowerCase().includes('timeout')) {
        setStateError('State update delayed. Retrying...');
      } else {
        setStateError(msg);
      }
    } finally {
      isFetchingStateRef.current = false;
      setIsLoadingState(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !agentLookupId) return;

    fetchState();
    const pollTimer = window.setInterval(() => fetchState(), 4000);
    return () => window.clearInterval(pollTimer);
  }, [isOpen, agentLookupId]);

  useEffect(() => {
    if (!isOpen || !agentLookupId) return;

    setLiveLogs([]);
    setStreamError(null);

    const streamUrl = getAgentLogsStreamUrl(agentLookupId, false);
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const item = {
          time: parsed?.time || new Date().toISOString(),
          severity: parsed?.severity || 'INFO',
          payload: parsed?.payload,
        };

        setLiveLogs((prev) => {
          const next = [...prev, item];
          return next.length > 200 ? next.slice(next.length - 200) : next;
        });
      } catch {
        // Ignore malformed stream chunks.
      }
    };

    eventSource.onerror = () => {
      setStreamError('Live stream disconnected. Retrying...');
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, agentLookupId]);

  useEffect(() => {
    if (!logsViewportRef.current) return;
    logsViewportRef.current.scrollTop = logsViewportRef.current.scrollHeight;
  }, [liveLogs]);

  useEffect(() => {
    if (!lastStateUpdatedAt) return;
    const timer = window.setInterval(() => {
      const delta = Math.max(0, Math.floor((Date.now() - lastStateUpdatedAt.getTime()) / 1000));
      setSecondsSinceUpdate(delta);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastStateUpdatedAt]);

  const displayedLogs = useMemo(() => liveLogs, [liveLogs]);

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
            <div className={`w-full lg:w-2/5 border-r p-5 flex flex-col ${isDark ? 'border-dark-border bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Current Live Logs</h3>
              </div>

              {streamError && (
                <div className="text-xs font-semibold text-amber-500 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-3">
                  {streamError}
                </div>
              )}

              <div ref={logsViewportRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {displayedLogs.length > 0 ? (
                  displayedLogs.map((entry, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border font-mono text-xs ${isDark ? 'bg-dark-card border-dark-border text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                      <div className="text-gray-500 mb-1">
                        [{entry?.time || 'live'}] {entry?.severity ? `[${entry.severity}]` : ''}
                      </div>
                      <div>{typeof entry?.payload === 'string' ? entry.payload : JSON.stringify(entry?.payload)}</div>
                    </div>
                  ))
                ) : isLoadingState ? (
                  <div className={`text-xs p-3 rounded-lg border flex items-center gap-2 ${isDark ? 'bg-dark-card border-dark-border text-gray-500' : 'bg-white border-gray-200 text-gray-500'}`}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading live logs...
                  </div>
                ) : (
                  <div className={`text-xs p-3 rounded-lg border ${isDark ? 'bg-dark-card border-dark-border text-gray-500' : 'bg-white border-gray-200 text-gray-500'}`}>
                    Waiting for live log stream...
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-3/5 p-5 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bot className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Agent State</h3>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {secondsSinceUpdate === null ? 'not updated yet' : `updated ${secondsSinceUpdate}s ago`}
                  </span>
                  <button
                    onClick={() => fetchState(true)}
                    disabled={isLoadingState}
                    className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} disabled:opacity-60`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingState ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoadingState && !stateData ? (
                    <>
                      <MetricBlockLoading title="Traffic" isDark={isDark} />
                      <MetricBlockLoading title="Infrastructure" isDark={isDark} />
                      <MetricBlockLoading title="Network" isDark={isDark} />
                    </>
                  ) : (
                    <>
                      <MetricBlock title="Traffic" metrics={stateData?.state?.traffic} isDark={isDark} />
                      <MetricBlock title="Infrastructure" metrics={stateData?.state?.infrastructure} isDark={isDark} />
                      <MetricBlock title="Network" metrics={stateData?.state?.network} isDark={isDark} />
                    </>
                  )}
                  <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider mb-3 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}>Snapshot</h4>
                    {isLoadingState && !stateData ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading snapshot...
                      </div>
                    ) : (
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
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock3 className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Agent Configuration (View Only)</h3>
                </div>

                <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  {!service ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading configuration...
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
