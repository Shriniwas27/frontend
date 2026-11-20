import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { pollGitHub, startGitHub } from '../api';

export default function GitHubConnectionStep({ token, githubLogin, onComplete, onBack, onExpired }) {
  const [challenge, setChallenge] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const startRequest = useRef(null);

  useEffect(() => () => startRequest.current?.abort(), []);

  const begin = async () => {
    const controller = new AbortController();
    startRequest.current = controller;
    setIsStarting(true);
    setError('');
    setCopyStatus('');
    try {
      const { data } = await startGitHub(token, controller.signal);
      if (controller.signal.aborted) return;
      if (data.status === 'complete') onComplete(data);
      else setChallenge(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err.response?.status === 401) onExpired();
      else setError(err.response?.data?.detail || 'Could not connect to GitHub. Please try again.');
    } finally {
      if (!controller.signal.aborted) setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!challenge) return;
    const controller = new AbortController();
    let retryTimer;
    const poll = async () => {
      try {
        const { data } = await pollGitHub(token, controller.signal);
        if (controller.signal.aborted) return;
        if (data.status === 'complete') onComplete(data);
        else if (data.status === 'pending') {
          setError('');
          setChallenge(data);
        } else {
          setChallenge(null);
          setError(data.status === 'denied' ? 'GitHub authorization was declined. Request a new code to try again.' : 'This device code expired. Request a new code to continue.');
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err.response?.status === 401) {
          onExpired();
        } else if (err.response?.status === 409) {
          setChallenge(null);
          setError(err.response.data.detail);
        } else {
          setError('Connection interrupted. Vantome will check again automatically.');
          retryTimer = window.setTimeout(poll, 5000);
        }
      }
    };
    retryTimer = window.setTimeout(poll, Math.max(1, Math.min(challenge.retryAfter, challenge.expiresIn)) * 1000);
    return () => {
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, [challenge, token, onComplete, onExpired]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(challenge.userCode);
      setCopyStatus('Code copied');
    } catch {
      setCopyStatus('Select the code to copy it manually.');
    }
  };

  return (
    <div className="login-form-step">
      <div className="login-form-header">
        <h2 className="login-form-title">Connect GitHub</h2>
        <p className="login-form-desc">
          {githubLogin
            ? `Verify your connection to @${githubLogin} to open your dashboard.`
            : 'Authorize Vantome on GitHub to finish setting up your account.'}
        </p>
      </div>

      {challenge ? (
        <>
          <ol className="login-github-instructions">
            <li>Copy the device code below.</li>
            <li>Open GitHub in a new tab, sign in, and paste the code.</li>
            <li>Authorize Vantome on GitHub and return to this tab.</li>
          </ol>
          <div className="login-github-code">
            <code aria-label="GitHub device code">{challenge.userCode}</code>
            <button type="button" className="login-btn-back" onClick={copyCode}>
              <Copy size={16} aria-hidden="true" /> Copy code
            </button>
          </div>
          {copyStatus && <p className="login-github-status" role="status">{copyStatus}</p>}
          <a className="login-btn-next" href={challenge.verificationUri} target="_blank" rel="noopener noreferrer">
            Open GitHub <ExternalLink size={16} aria-hidden="true" />
          </a>
          <p className="login-github-status" role="status">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Waiting for GitHub approval. Your dashboard will open automatically.
          </p>
        </>
      ) : (
        <button type="button" className="login-btn-next" onClick={begin} disabled={isStarting}>
          {isStarting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
            : <>{error ? 'Try again' : githubLogin ? 'Verify GitHub connection' : 'Get device code'} <ArrowRight size={16} /></>}
        </button>
      )}

      {error && <div className="login-error" role="alert">{error}</div>}
      <button type="button" className="login-btn-back" onClick={onBack} disabled={isStarting}>
        <ChevronLeft size={16} /> Back to cloud setup
      </button>
    </div>
  );
}
