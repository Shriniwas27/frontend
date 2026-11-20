import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { pollGitHub, startGitHub } from '../api';

export default function SelfHealingGitHubStep({ isDark, enabled, onEnabledChange, onComplete, onSkip }) {
  const [challenge, setChallenge] = useState(null);
  const [githubLogin, setGithubLogin] = useState('');
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const controllerRef = useRef(null);

  const begin = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsStarting(true);
    setError('');
    try {
      const { data } = await startGitHub(localStorage.getItem('cybermedic_token'), controller.signal);
      if (data.status === 'complete') {
        setGithubLogin(data.githubLogin || '');
        onComplete(data);
      } else {
        setChallenge(data);
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err.response?.data?.detail || 'Could not start GitHub authentication.');
    } finally {
      if (!controller.signal.aborted) setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!challenge) return undefined;
    const controller = new AbortController();
    let timer;
    const poll = async () => {
      try {
        const { data } = await pollGitHub(localStorage.getItem('cybermedic_token'), controller.signal);
        if (controller.signal.aborted) return;
        if (data.status === 'complete') {
          setGithubLogin(data.githubLogin || '');
          setChallenge(null);
          onComplete(data);
        } else if (data.status === 'pending') {
          setChallenge((current) => ({ ...current, retryAfter: data.retryAfter || current.retryAfter }));
        } else {
          setChallenge(null);
          setError(data.status === 'denied' ? 'GitHub authorization was declined.' : 'The GitHub device code expired.');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.response?.data?.detail || 'Connection interrupted. Please try again.');
          timer = window.setTimeout(poll, 5000);
        }
      }
    };
    timer = window.setTimeout(poll, Math.max(1, challenge.retryAfter || 5) * 1000);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [challenge, onComplete]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(challenge.userCode);
      setCopyStatus('Code copied');
    } catch {
      setCopyStatus('Copy the code manually.');
    }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-5 ${isDark ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
          <ShieldCheck className={`w-6 h-6 shrink-0 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
          <div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Activate self-healing service</h3>
            <p className="text-sm text-gray-500 mt-1">
              Connect GitHub so Vantome can use your authorized repository access for future self-healing workflows.
            </p>
          </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onEnabledChange(!enabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${
              enabled
                ? (isDark ? 'bg-emerald-accent' : 'bg-google-blue')
                : (isDark ? 'bg-gray-700' : 'bg-gray-300')
            }`}
          >
            <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {!enabled && (
        <p className={`rounded-xl border p-4 text-sm ${isDark ? 'border-dark-border bg-gray-900/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
          Self-healing is off. Continue to the next step without GitHub authorization.
        </p>
      )}

      {enabled && !challenge && !githubLogin && (
        <>
          <ol className={`list-decimal pl-5 space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <li>Click <strong>Authenticate with GitHub</strong>.</li>
            <li>Copy the one-time device code shown here.</li>
            <li>Open GitHub, sign in, paste the code, and approve Vantome.</li>
            <li>Return to this page; authorization will be detected automatically.</li>
          </ol>
          <button
            onClick={begin}
            disabled={isStarting}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold disabled:opacity-60 ${
              isDark ? 'bg-emerald-accent text-dark-bg' : 'bg-google-blue text-white'
            }`}
          >
            {isStarting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting authentication...</> : <>Authenticate with GitHub <ArrowRight className="w-4 h-4" /></>}
          </button>
        </>
      )}

      {enabled && challenge && (
        <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'bg-gray-900/60 border-dark-border' : 'bg-white border-gray-200'}`}>
          <p className="text-sm text-gray-500">1. Copy the device code. 2. Open GitHub and enter it. 3. Approve access and return here.</p>
          <code className={`block text-center text-2xl tracking-widest font-bold p-4 rounded-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}>{challenge.userCode}</code>
          <div className="flex gap-3">
            <button onClick={copyCode} className="flex-1 px-4 py-2 rounded-lg border font-bold text-sm"><Copy className="inline w-4 h-4 mr-2" />Copy code</button>
            <a
              href={challenge.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 text-center px-4 py-2 rounded-lg text-white font-bold text-sm ${isDark ? 'bg-emerald-accent text-dark-bg' : 'bg-google-blue'}`}
            >
              <ExternalLink className="inline w-4 h-4 mr-2" />Open GitHub
            </a>
          </div>
          {copyStatus && <p className="text-xs text-green-600">{copyStatus}</p>}
          <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" />Waiting for GitHub approval...</p>
        </div>
      )}

      {githubLogin && (
        <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          GitHub connected as <strong>@{githubLogin}</strong>
        </div>
      )}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
