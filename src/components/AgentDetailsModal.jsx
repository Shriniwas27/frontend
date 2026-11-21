import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Settings2,
  XCircle,
  GitBranch,
  ExternalLink,
} from 'lucide-react';
import { getAgentLogsStreamUrl, getAgentState, triggerSelfHeal } from '../api';

const isErrorSeverity = (value) => {
  const normalized = String(value || '').toLowerCase();
  return normalized.includes('error') || normalized.includes('fatal') || normalized.includes('critical');
};

const isNotificationSeverity = (value) => {
  const normalized = String(value || '').toLowerCase();
  return normalized.includes('notification') || normalized.includes('notify');
};

const isAnalysisSuggestionEntry = (entry) => {
  const severity = String(entry?.severity || '').toLowerCase();
  const eventType = String(entry?.eventType || '').toLowerCase();
  return severity.includes('analysis') || eventType === 'analysisandsuggestion';
};

const isResourceUpdateEntry = (entry) => {
  const severity = String(entry?.severity || '').toLowerCase();
  const eventType = String(entry?.eventType || '').toLowerCase();
  return severity.includes('resource_update') || eventType === 'resource_update';
};

const getDisplaySeverityLabel = (entry) => {
  if (isAnalysisSuggestionEntry(entry)) {
    return 'ANALYSIS_SUGGESTION';
  }
  if (isResourceUpdateEntry(entry)) {
    return 'RESOURCE_UPDATE';
  }
  if (isNotificationSeverity(entry?.severity) || entry?.eventType === 'notification') {
    return 'NOTIFICATION';
  }
  return String(entry?.severity || 'INFO').toUpperCase();
};

const formatPayloadForDisplay = (payload) => {
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload ?? '');
  }
};

const ShimmerLines = ({ isDark, lineCount = 3 }) => (
  <div className={`rounded-lg border p-3 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'}`}>
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lineCount }).map((_, idx) => (
        <div
          key={`shimmer-${idx}`}
          className={`h-2.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'} ${idx === lineCount - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  </div>
);

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

export default function AgentDetailsModal({ isOpen, onClose, onEditConfiguration, onNotification, service, theme }) {
  const isDark = theme === 'dark';
  const [stateData, setStateData] = useState(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isConnectingStream, setIsConnectingStream] = useState(false);
  const [stateError, setStateError] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [hasInitializedStream, setHasInitializedStream] = useState(false);
  const [lastStateUpdatedAt, setLastStateUpdatedAt] = useState(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [copiedLogKey, setCopiedLogKey] = useState(null);
  const [quickAlert, setQuickAlert] = useState(null);
  const isFetchingStateRef = useRef(false);
  const logsViewportRef = useRef(null);
  const incidentLogsViewportRef = useRef(null);
  const copyTimerRef = useRef(null);
  const quickAlertTimerRef = useRef(null);
  const lastAlertRef = useRef({ kind: null, at: 0 });

  const agentLookupId = service?.agentId || service?.id;
  const linkedRepo = stateData?.github_repo || service?.githubRepo || (service?.repoUrl ? { repo_url: service.repoUrl } : null);
  const repoUrl = linkedRepo?.repo_url || service?.repoUrl || '';
  const deployedUrl = stateData?.deployed_url || service?.deployedUrl || '';
  const consoleUrl = stateData?.console_url || service?.consoleUrl || (service?.gcpProject && service?.microserviceName ? `https://console.cloud.google.com/run/detail/${service.gcpLocation || 'asia-south1'}/${service.microserviceName.split('/').pop()}/metrics?project=${service.gcpProject}` : '');

  const [isSelfHealing, setIsSelfHealing] = useState(false);
  const [selfHealResult, setSelfHealResult] = useState(null);

  const handleTriggerSelfHeal = async () => {
    if (!agentLookupId || isSelfHealing) return;
    try {
      setIsSelfHealing(true);
      const res = await triggerSelfHeal(agentLookupId);
      const resultData = res.data?.data;
      const summary = resultData?.fix_result?.summary || resultData?.error || 'Self-healing triggered';
      setSelfHealResult(resultData);
      showQuickAlert('suggestion');
      if (onNotification) {
        onNotification({
          type: 'success',
          message: `Self-healing: ${summary}`
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Self-healing request failed';
      showQuickAlert('error');
      if (onNotification) {
        onNotification({
          type: 'error',
          message: msg
        });
      }
    } finally {
      setIsSelfHealing(false);
    }
  };

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

  const playSuggestionTone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playNote = (freq, startAt, duration, gainValue) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(gainValue, startAt + 0.02);
        gain.gain.linearRampToValueAtTime(0, startAt + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + duration + 0.02);
      };

      playNote(880, now, 0.18, 0.18);
      playNote(1175, now + 0.14, 0.2, 0.16);

      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 700);
    } catch {
      // Ignore browser autoplay and audio context errors.
    }
  }, []);

  const playResourceUpdateTone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playNote = (freq, startAt, duration, gainValue) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(gainValue, startAt + 0.02);
        gain.gain.linearRampToValueAtTime(0, startAt + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + duration + 0.02);
      };

      playNote(620, now, 0.16, 0.15);
      playNote(780, now + 0.12, 0.18, 0.14);

      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 700);
    } catch {
      // Ignore browser autoplay and audio context errors.
    }
  }, []);

  const showQuickAlert = useCallback((kind) => {
    const now = Date.now();
    if (lastAlertRef.current.kind === kind && now - lastAlertRef.current.at < 1800) {
      return;
    }

    lastAlertRef.current = { kind, at: now };
    const nextAlert = {
      id: now,
      kind,
      text: kind === 'error' ? 'Error detected' : 'Suggestion received',
    };
    setQuickAlert(nextAlert);

    if (quickAlertTimerRef.current) {
      window.clearTimeout(quickAlertTimerRef.current);
    }
    quickAlertTimerRef.current = window.setTimeout(() => {
      setQuickAlert((prev) => (prev?.id === nextAlert.id ? null : prev));
    }, 2200);
  }, []);

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
    setIsConnectingStream(true);
    setHasInitializedStream(false);
    setNotificationCount(0);

    const streamUrl = getAgentLogsStreamUrl(agentLookupId, false);
    let eventSource;
    try {
      eventSource = new EventSource(streamUrl);
    } catch {
      setStreamError('Live stream unavailable. Please retry.');
      setIsConnectingStream(false);
      setHasInitializedStream(true);
      return undefined;
    }

    const appendLogEntry = (item) => {
      setLiveLogs((prev) => {
        const next = [...prev, item];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
    };

    const parseLogEvent = (eventData) => {
      const parsed = JSON.parse(eventData);
      return {
        time: parsed?.time || new Date().toISOString(),
        severity: parsed?.severity || parsed?.type || parsed?.level || parsed?.tag || 'INFO',
        payload: parsed?.payload ?? parsed?.message ?? parsed,
      };
    };

    eventSource.onopen = () => {
      setIsConnectingStream(false);
      setStreamError(null);
      setHasInitializedStream(true);
    };

    eventSource.addEventListener('log', (event) => {
      try {
        const parsedLog = parseLogEvent(event.data);
        appendLogEntry(parsedLog);
        if (isErrorSeverity(parsedLog?.severity)) {
          showQuickAlert('error');
        }
        setIsConnectingStream(false);
        setHasInitializedStream(true);
      } catch {
        // Ignore malformed log events.
      }
    });

    eventSource.addEventListener('notification', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const eventType = String(parsed?.event || '').toLowerCase();
        const level = String(parsed?.level || 'error').toUpperCase();
        const title = parsed?.title || 'Agent Notification';
        const message = parsed?.message || 'A notification event was received.';
        const analysisText = parsed?.analysis || parsed?.suggestion || parsed?.details;
        const isAnalysisEvent = eventType === 'analysisandsuggestion';
        const isResourceUpdateEvent = eventType === 'resource_update';
        const notificationEntry = {
          time: parsed?.time || new Date().toISOString(),
          severity: isAnalysisEvent ? 'ANALYSIS_SUGGESTION' : isResourceUpdateEvent ? 'RESOURCE_UPDATE' : 'NOTIFICATION',
          eventType: isAnalysisEvent ? 'analysisandsuggestion' : isResourceUpdateEvent ? 'resource_update' : 'notification',
          level,
          payload: isAnalysisEvent || isResourceUpdateEvent
            ? analysisText || 'No details provided.'
            : `${title}: ${message}`,
        };

        appendLogEntry(notificationEntry);
        setNotificationCount((prev) => prev + 1);
        if (isAnalysisEvent) {
          playSuggestionTone();
          showQuickAlert('suggestion');
        } else if (isResourceUpdateEvent) {
          playResourceUpdateTone();
        }
        if (typeof onNotification === 'function') {
          onNotification({ ...parsed, title, message, level });
        }
        setIsConnectingStream(false);
        setHasInitializedStream(true);
      } catch {
        // Ignore malformed notification events.
      }
    });

    eventSource.onmessage = (event) => {
      try {
        // Backward-compatible fallback for unnamed SSE events.
        const fallbackLog = parseLogEvent(event.data);
        appendLogEntry(fallbackLog);
        if (isErrorSeverity(fallbackLog?.severity)) {
          showQuickAlert('error');
        }
        setIsConnectingStream(false);
        setHasInitializedStream(true);
      } catch {
        // Ignore malformed fallback events.
      }
    };

    eventSource.onerror = () => {
      setStreamError('Live stream disconnected. Retrying...');
      setIsConnectingStream(false);
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, agentLookupId, onNotification, playResourceUpdateTone, playSuggestionTone, showQuickAlert]);

  useEffect(() => () => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    if (quickAlertTimerRef.current) {
      window.clearTimeout(quickAlertTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!logsViewportRef.current) return;
    logsViewportRef.current.scrollTop = logsViewportRef.current.scrollHeight;
  }, [liveLogs]);

  useEffect(() => {
    if (!incidentLogsViewportRef.current) return;
    incidentLogsViewportRef.current.scrollTop = incidentLogsViewportRef.current.scrollHeight;
  }, [liveLogs]);

  useEffect(() => {
    if (!lastStateUpdatedAt) return;
    const timer = window.setInterval(() => {
      const delta = Math.max(0, Math.floor((Date.now() - lastStateUpdatedAt.getTime()) / 1000));
      setSecondsSinceUpdate(delta);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastStateUpdatedAt]);

  const displayedLogs = useMemo(
    () => liveLogs.filter(
      (entry) => !isNotificationSeverity(entry?.severity) && !isAnalysisSuggestionEntry(entry) && !isResourceUpdateEntry(entry),
    ),
    [liveLogs],
  );

  const incidentLogs = useMemo(
    () => liveLogs.filter(
      (entry) =>
        isErrorSeverity(entry?.severity)
        || isNotificationSeverity(entry?.severity)
        || isAnalysisSuggestionEntry(entry)
        || isResourceUpdateEntry(entry),
    ),
    [liveLogs],
  );

  const agentHealth = useMemo(() => {
    if (stateError || streamError) {
      return null;
    }

    const rawStatus = String(stateData?.status || stateData?.state?.status || service?.status || '').toLowerCase();
    if (['healthy', 'active', 'running', 'ok', 'ready', 'success'].some((token) => rawStatus.includes(token))) {
      return {
        label: 'Healthy',
        icon: CheckCircle2,
        className: isDark
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
          : 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      };
    }

    if (['warning', 'degraded', 'pending', 'starting', 'warming'].some((token) => rawStatus.includes(token))) {
      return {
        label: 'Attention',
        icon: AlertTriangle,
        className: isDark
          ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
          : 'bg-amber-100 text-amber-800 border border-amber-300',
      };
    }

    return {
      label: 'Unknown',
      icon: Info,
      className: isDark
        ? 'bg-gray-700/30 text-gray-300 border border-gray-600'
        : 'bg-gray-100 text-gray-700 border border-gray-200',
    };
  }, [isDark, service?.status, stateData, stateError, streamError]);

  const copyLogText = async (logKey, entry) => {
    const payloadText = typeof entry?.payload === 'string' ? entry.payload : JSON.stringify(entry?.payload);
    const text = `[${entry?.time || 'live'}] [${String(entry?.severity || 'INFO').toUpperCase()}] ${payloadText}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedLogKey(logKey);

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedLogKey((prev) => (prev === logKey ? null : prev));
      }, 1400);
    } catch {
      // Clipboard writes can fail in restricted browser contexts.
    }
  };

  if (!isOpen || !service) return null;

  return (
    <div className="ui-card-soft ui-enter relative flex h-full w-full flex-col overflow-hidden rounded-2xl">
        {quickAlert && (
          <div className="fixed top-5 right-5 z-50 pointer-events-none">
            <div className={`ui-quick-alert px-3 py-2 rounded-lg border shadow-lg text-xs font-semibold backdrop-blur-sm ${quickAlert.kind === 'error'
              ? (isDark ? 'bg-rose-950/85 border-rose-500/40 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700')
              : (isDark ? 'bg-violet-950/85 border-violet-500/40 text-violet-200' : 'bg-violet-50 border-violet-200 text-violet-700')}`}>
              {quickAlert.text}
            </div>
          </div>
        )}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-app-border bg-app-card px-3 py-4 sm:px-6">
          <div>
            <h1 className="workspace-title text-2xl">Agent details</h1>
            <p className={`text-sm flex flex-wrap items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <span>{service.agentName || 'Agent'} · {service.microserviceName || 'Service'} · {service.gcpProject || 'Project'}</span>
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono transition-colors ${
                    isDark ? 'bg-gray-800 text-emerald-accent hover:bg-gray-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title="Open GitHub Repository"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{linkedRepo?.repo || repoUrl.replace('https://github.com/', '')}</span>
                  {linkedRepo?.branch && (
                    <span className="text-[10px] opacity-75 font-sans">({linkedRepo.branch})</span>
                  )}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {deployedUrl && (
              <a
                href={deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${
                  isDark
                    ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60 hover:text-emerald-300'
                    : 'bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                }`}
                title="Open deployed live service in new tab"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Visit Live App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {consoleUrl && (
              <a
                href={consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${
                  isDark
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                title="Open Google Cloud Console for this service"
              >
                <span>GCP Console</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}
            <button
              onClick={onEditConfiguration}
              className="brand-button brand-button-primary"
            >
              <Settings2 className="w-4 h-4" /> Edit configuration
            </button>
            <button
              onClick={onClose}
              className="workspace-icon-button"
              aria-label="Close agent details"
            >
              <XCircle className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
          <div className="h-full flex flex-col lg:flex-row">
            <div className={`w-full lg:w-2/3 border-r ${isDark ? 'border-dark-border bg-gray-900/20' : 'border-gray-200 bg-gray-50/60'}`}>
              <div className="h-full flex flex-col xl:flex-row">
                <div className={`w-full xl:w-2/5 border-b xl:border-b-0 xl:border-r p-5 flex flex-col ui-soft-transition ${isDark ? 'border-dark-border bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                <span className={`ui-symbol-dot ${isDark ? 'bg-emerald-400' : 'bg-google-blue'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Current Live Logs</h3>
              </div>

              {streamError && (
                <div className="text-xs font-semibold text-amber-500 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-3">
                  {streamError}
                </div>
              )}

              <div ref={logsViewportRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {displayedLogs.length > 0 ? (
                  displayedLogs.map((entry, idx) => {
                    const hasError = isErrorSeverity(entry?.severity);
                    const isNotification = isNotificationSeverity(entry?.severity);
                    const SeverityIcon = hasError ? AlertTriangle : isNotification ? BellRing : Info;
                    const logKey = `live-${idx}`;
                    return (
                    <div key={idx} className={`group relative p-3 rounded-lg border font-mono text-xs ui-soft-transition ui-log-entry ${hasError
                        ? (isDark ? 'bg-rose-900/20 border-rose-500/40 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700')
                        : (isDark ? 'bg-dark-card border-dark-border text-gray-300' : 'bg-white border-gray-200 text-gray-700')}`}>
                      <button
                        type="button"
                        onClick={() => copyLogText(logKey, entry)}
                        className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-opacity opacity-0 group-hover:opacity-100 ${isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        aria-label="Copy log line"
                      >
                        {copiedLogKey === logKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedLogKey === logKey ? 'Copied' : 'Copy'}
                      </button>
                      <div className={`mb-1 flex items-center gap-1.5 ${hasError
                        ? (isDark ? 'text-rose-300' : 'text-rose-600')
                        : isNotification
                        ? (isDark ? 'text-sky-300' : 'text-sky-700')
                        : 'text-gray-500'}`}>
                        <SeverityIcon className="w-3.5 h-3.5" />
                        <span>[{entry?.time || 'live'}] [{getDisplaySeverityLabel(entry)}]</span>
                      </div>
                      <div>{formatPayloadForDisplay(entry?.payload)}</div>
                    </div>
                    );
                  })
                ) : isConnectingStream && !hasInitializedStream ? (
                  <ShimmerLines isDark={isDark} lineCount={4} />
                ) : (
                  <div className={`text-xs p-3 rounded-lg border ${isDark ? 'bg-dark-card border-dark-border text-gray-500' : 'bg-white border-gray-200 text-gray-500'}`}>
                    Waiting for non-notification stream logs...
                  </div>
                )}
              </div>
            </div>

                <div className="w-full xl:w-3/5 p-5 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bot className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                  <span className={`ui-symbol-dot ${isDark ? 'bg-emerald-400' : 'bg-google-blue'}`} />
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Agent State</h3>
                  {agentHealth && agentHealth.label !== 'Unknown' && agentHealth.label !== 'Degraded' && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${agentHealth.className}`}>
                      <agentHealth.icon className="w-3.5 h-3.5" /> {agentHealth.label}
                    </span>
                  )}
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {secondsSinceUpdate === null ? 'not updated yet' : `updated ${secondsSinceUpdate}s ago`}
                  </span>
                  <button
                    onClick={() => fetchState(true)}
                    disabled={isLoadingState}
                    className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} disabled:opacity-60`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingState && !stateData ? 'animate-spin' : ''}`} /> Refresh
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
                        {repoUrl && (
                          <div className="flex items-center justify-between gap-3">
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Repository</span>
                            <a
                              href={repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-mono inline-flex items-center gap-1 text-xs hover:underline ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}
                              title="Open GitHub Repository"
                            >
                              <GitBranch className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{linkedRepo?.owner && linkedRepo?.repo ? `${linkedRepo.owner}/${linkedRepo.repo}` : repoUrl.replace('https://github.com/', '')}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          </div>
                        )}
                        {deployedUrl && (
                          <div className="flex items-center justify-between gap-3">
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Live App</span>
                            <a
                              href={deployedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-mono inline-flex items-center gap-1 text-xs hover:underline ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}
                              title="Open Live Deployed Service"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="truncate max-w-[150px]">{deployedUrl.replace('https://', '')}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          </div>
                        )}
                        {consoleUrl && (
                          <div className="flex items-center justify-between gap-3">
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>GCP Console</span>
                            <a
                              href={consoleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-mono inline-flex items-center gap-1 text-xs hover:underline ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}
                              title="Open Cloud Run Console"
                            >
                              <span>Console Dashboard</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock3 className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                  <span className={`ui-symbol-dot ${isDark ? 'bg-emerald-400' : 'bg-google-blue'}`} />
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
                      {repoUrl && (
                        <div className={`flex items-center justify-between py-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                          <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Linked GitHub Repo</span>
                          <a
                            href={repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm font-medium inline-flex items-center gap-1.5 hover:underline ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}
                            title="Open GitHub Repository"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>{linkedRepo?.owner && linkedRepo?.repo ? `${linkedRepo.owner}/${linkedRepo.repo}` : repoUrl}</span>
                            {linkedRepo?.branch && <span className="text-xs opacity-75 font-mono">({linkedRepo.branch})</span>}
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      )}
                      {deployedUrl && (
                        <div className={`flex items-center justify-between py-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                          <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Live Deployed URL</span>
                          <a
                            href={deployedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm font-medium inline-flex items-center gap-1.5 hover:underline ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}
                            title="Open Deployed URL"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-mono text-xs">{deployedUrl}</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      )}
                      {consoleUrl && (
                        <div className={`flex items-center justify-between py-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                          <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cloud Run Console</span>
                          <a
                            href={consoleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm font-medium inline-flex items-center gap-1.5 hover:underline ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}
                            title="Open Cloud Run Console"
                          >
                            <span>Open in GCP Console</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      )}
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

            <div className={`w-full lg:w-1/3 p-5 flex flex-col ${isDark ? 'bg-gray-900/40 border-l border-dark-border' : 'bg-blue-50/50 border-l border-blue-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className={`ui-symbol-dot ${isDark ? 'bg-violet-400' : 'bg-violet-500'}`} />
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Agent Analysis Terminal</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                    <BellRing className="w-3 h-3" /> {notificationCount}
                  </span>
                  <span className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Live Socket Feed</span>
                </div>
              </div>

              {streamError && (
                <div className={`text-xs font-semibold p-3 rounded-md border mb-3 ${isDark ? 'text-amber-300 bg-amber-500/10 border-amber-400/30' : 'text-amber-700 bg-amber-100 border-amber-300'}`}>
                  {streamError}
                </div>
              )}

              <div className={`mb-3 p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                isDark 
                  ? 'bg-gradient-to-r from-emerald-950/40 to-sky-950/40 border-emerald-500/30' 
                  : 'bg-gradient-to-r from-emerald-50/80 to-sky-50/80 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className={`text-[11px] font-bold block ${isDark ? 'text-white' : 'text-gray-900'}`}>Self-Healing Microservice</span>
                    <span className={`text-[10px] block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Auto-repair code crashes & exceptions</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerSelfHeal}
                  disabled={isSelfHealing}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    isDark 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-dark-bg font-extrabold' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  } disabled:opacity-50`}
                  title="Trigger automated code fix on GitHub repository"
                >
                  {isSelfHealing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isSelfHealing ? 'Healing...' : 'Self-Heal'}</span>
                </button>
              </div>

              {selfHealResult && (
                <div className={`text-xs p-2.5 rounded-lg border mb-3 font-mono ${
                  selfHealResult.status === 'success'
                    ? (isDark ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                    : (isDark ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800')
                }`}>
                  <div className="font-bold flex items-center justify-between mb-1">
                    <span>STATUS: {selfHealResult.status?.toUpperCase()}</span>
                    <button onClick={() => setSelfHealResult(null)} className="text-[10px] opacity-70 hover:opacity-100">✕</button>
                  </div>
                  <div>{selfHealResult.fix_result?.summary || selfHealResult.error || 'Fix request processed.'}</div>
                </div>
              )}

              <div
                ref={incidentLogsViewportRef}
                className={`flex-1 min-h-0 overflow-y-auto rounded-lg border p-3 space-y-2 font-mono text-xs transition-colors ${isDark ? 'border-emerald-500/30 bg-gray-950/60' : 'border-blue-200 bg-white'}`}
              >
                {incidentLogs.length > 0 ? (
                  incidentLogs.map((entry, idx) => {
                    const isError = isErrorSeverity(entry?.severity);
                    const isNotification = isNotificationSeverity(entry?.severity);
                    const isAnalysis = isAnalysisSuggestionEntry(entry);
                    const isResourceUpdate = isResourceUpdateEntry(entry);
                    const SeverityIcon = isError
                      ? AlertTriangle
                      : isAnalysis
                      ? Sparkles
                      : isResourceUpdate
                      ? CheckCircle2
                      : isNotification
                      ? BellRing
                      : Info;
                    const logKey = `incident-${idx}`;
                    return (
                      <div key={`incident-${idx}`} className={`group relative border-l-2 pl-3 pr-16 py-2 ui-soft-transition hover:translate-x-1 ui-log-entry ${isResourceUpdate ? 'rounded' : 'rounded-r'} ${isError
                        ? (isDark ? 'border-rose-400 bg-rose-950/30' : 'border-rose-400 bg-rose-50')
                        : isAnalysis
                        ? (isDark ? 'border-sky-400 bg-sky-950/20' : 'border-sky-400 bg-sky-50')
                        : isResourceUpdate
                        ? (isDark ? 'border-emerald-400 bg-emerald-950/20' : 'border-emerald-400 bg-emerald-50')
                        : (isDark ? 'border-violet-400 bg-violet-950/20' : 'border-violet-400 bg-violet-50')} ${isAnalysis ? 'ui-suggestion-flash' : ''}`}>
                        <button
                          type="button"
                          onClick={() => copyLogText(logKey, entry)}
                          className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-opacity opacity-0 group-hover:opacity-100 ${isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                          aria-label="Copy analysis log line"
                        >
                          {copiedLogKey === logKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedLogKey === logKey ? 'Copied' : 'Copy'}
                        </button>
                        <div className={`flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <SeverityIcon className="w-3.5 h-3.5" />
                          <span>[{entry?.time || 'live'}] [{getDisplaySeverityLabel(entry)}]</span>
                        </div>
                        <div className={`${isAnalysis || isResourceUpdate ? 'text-[13px] font-semibold leading-relaxed' : ''} ${isError 
                          ? (isDark ? 'text-rose-300' : 'text-rose-700') 
                          : isAnalysis
                          ? (isDark ? 'text-sky-300' : 'text-sky-700')
                          : isResourceUpdate
                          ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
                          : isNotification 
                          ? (isDark ? 'text-violet-300' : 'text-violet-700') 
                          : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>
                          {'>'} {formatPayloadForDisplay(entry?.payload)}
                        </div>
                      </div>
                    );
                  })
                ) : isConnectingStream && !hasInitializedStream ? (
                  <ShimmerLines isDark={isDark} lineCount={4} />
                ) : (
                  <div className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                    {'>'} Waiting for ERROR / NOTIFICATION / ANALYSIS / RESOURCE_UPDATE events...
                  </div>
                )}
              </div>

              <div className={`mt-3 text-[11px] font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                socket://agent-stream/{agentLookupId || 'unknown'}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
