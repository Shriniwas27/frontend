import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Upload,
  User,
  Mail,
  Phone,
  Loader2,
  Cloud,
  CheckCircle2,
  Lock,
  KeyRound
} from 'lucide-react';
import { register, login, createAccount, clearAuthSession, storeAuthSession } from '../api';
import Brand from '../components/Brand';

const LoginPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [authMode, setAuthMode] = useState(state?.authMode === 'login' || state?.from ? 'login' : 'register');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pendingSignupUser, setPendingSignupUser] = useState(null);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    contactNumber: ''
  });

  const [credData, setCredData] = useState({
    credentialName: '',
    rawFileContent: '',
    accountDetails: ''
  });

  const updateUser = (key, value) => setUserData(prev => ({ ...prev, [key]: value }));
  const updateCred = (key, value) => setCredData(prev => ({ ...prev, [key]: value }));

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateCred('rawFileContent', event.target.result);
      if (!credData.credentialName) {
        updateCred('credentialName', file.name.replace('.json', ''));
      }
    };
    reader.readAsText(file);
  };

  const handleAuth = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (authMode === 'login') {
        // --- LOGIN FLOW ---
        const res = await login({
          email: userData.email,
          password: userData.password
        });

        if (res.data?.success) {
          storeAuthSession(res.data.data, res.data.accessToken);
          navigate('/dashboard');
        }
      } else {
        // --- REGISTER FLOW (STEP 1): persist user immediately ---
        const regRes = await register(userData);
        const user = regRes.data?.data;
        if (!user) {
          throw new Error('Could not create user. Please try again.');
        }

        setPendingSignupUser(user);
        storeAuthSession(user, regRes.data?.accessToken);
        setStep(2);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Authentication failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Reuse user created in step 1. Fallback to register only if missing.
      let user = pendingSignupUser;
      let fallbackToken = null;
      if (!user) {
        const regRes = await register(userData);
        user = regRes.data?.data;
        fallbackToken = regRes.data?.accessToken || null;
      }

      if (user) {
        if (!localStorage.getItem('cybermedic_token')) {
          storeAuthSession(user, fallbackToken);
        }
        // 2. Create account (GCP Credentials) if provided
        if (credData.rawFileContent) {
          await createAccount({
            userId: user.id,
            credentialName: credData.credentialName || 'Default GCP Account',
            rawFileContent: credData.rawFileContent,
            accountDetails: credData.accountDetails
          });
        }
        setPendingSignupUser(null);
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Registration failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = authMode === 'login'
    ? (userData.email && userData.password)
    : (userData.name && userData.email && userData.password);

  const isStep2Valid = credData.rawFileContent;

  return (
    <main className="login-page">
      <div className="w-full max-w-[57rem]">
        <Link to="/" className="brand-button brand-button-outline">Back to home</Link>
      </div>

      <div className="login-container">
        <div className="login-brand-panel">
          <div>
            <Brand />
            <p className="login-brand-title">Cloud service monitoring</p>
            <p className="login-brand-subtitle">Track service health and manage your AI agents in one place.</p>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="login-form-panel">
          <div className="login-form-content">
            {/* Step indicator */}
            {authMode === 'register' && <div className="login-steps-indicator">
              <span className="sr-only">Step {step} of 2</span>
              <div className={`login-step-dot ${step >= 1 ? 'active' : ''}`}>
                <User className="w-3.5 h-3.5" />
              </div>
              <div className={`login-step-line ${step >= 2 ? 'active' : ''}`}></div>
              <div className={`login-step-dot ${step >= 2 ? 'active' : ''}`}>
                <Cloud className="w-3.5 h-3.5" />
              </div>
            </div>}

            {step === 1 && (
              <div className="login-form-step">
                <div className="login-form-header">
                  <h1 className="login-form-title">
                    {authMode === 'register' ? 'Create your account' : 'Sign in'}
                  </h1>
                  <p className="login-form-desc">
                    {authMode === 'register'
                      ? 'Enter your details to get started with Vantome.'
                      : 'Use your Vantome account to open the dashboard.'}
                  </p>
                </div>

                <div className="login-form-fields">
                  {authMode === 'register' && (
                    <div className="login-field">
                      <label htmlFor="signup-name" className="login-label">Full name</label>
                      <div className="login-input-wrapper">
                        <User className="login-input-icon" />
                        <input
                          id="signup-name"
                          type="text"
                          autoComplete="name"
                          value={userData.name}
                          onChange={(e) => updateUser('name', e.target.value)}
                          placeholder="Josh Doe"
                          className="login-input"
                        />
                      </div>
                    </div>
                  )}

                  <div className="login-field">
                    <label htmlFor="login-email" className="login-label">Email address</label>
                    <div className="login-input-wrapper">
                      <Mail className="login-input-icon" />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        value={userData.email}
                        onChange={(e) => updateUser('email', e.target.value)}
                        placeholder="josh@example.com"
                        className="login-input"
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="login-password" className="login-label">Password</label>
                    <div className="login-input-wrapper">
                      <KeyRound className="login-input-icon" />
                      <input
                        id="login-password"
                        type="password"
                        autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                        value={userData.password}
                        onChange={(e) => updateUser('password', e.target.value)}
                        placeholder="••••••••"
                        className="login-input"
                      />
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div className="login-field">
                      <label htmlFor="signup-phone" className="login-label">Phone number (optional)</label>
                      <div className="login-input-wrapper">
                        <Phone className="login-input-icon" />
                        <input
                          id="signup-phone"
                          type="tel"
                          autoComplete="tel"
                          value={userData.contactNumber}
                          onChange={(e) => updateUser('contactNumber', e.target.value)}
                          placeholder="+91 98765 43210"
                          className="login-input"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}

                <button
                  onClick={handleAuth}
                  disabled={!isStep1Valid || isSubmitting}
                  className="brand-button brand-button-primary login-btn-next"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    authMode === 'register' ? 'Continue' : 'Sign in'
                  )}
                </button>

                <div className="login-switch-mode">
                  {authMode === 'register' ? (
                    <p>Already have an account? <button onClick={() => { clearAuthSession(); setAuthMode('login'); setError(null); }}>Sign in</button></p>
                  ) : (
                    <p>New to Vantome? <button onClick={() => { clearAuthSession(); setAuthMode('register'); setError(null); }}>Create an account</button></p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="login-form-step">
                <div className="login-form-header">
                  <h1 className="login-form-title">Connect your cloud</h1>
                  <p className="login-form-desc">Add your Google Cloud service account key to continue.</p>
                </div>

                <div className="login-form-fields">
                  <div className="login-field">
                    <label htmlFor="cloud-account-name" className="login-label">Account name</label>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon" />
                      <input
                        id="cloud-account-name"
                        type="text"
                        value={credData.credentialName}
                        onChange={(e) => updateCred('credentialName', e.target.value)}
                        placeholder="Production GCP Account"
                        className="login-input"
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <span className="login-label" id="cloud-key-label">Service account key (JSON)</span>
                    <label className={`login-upload-zone ${credData.rawFileContent ? 'has-file' : ''}`}>
                      {credData.rawFileContent ? (
                        <>
                          <CheckCircle2 className="size-7" aria-hidden="true" />
                          <span className="login-upload-text">Credentials added</span>
                          <span className="login-upload-hint">Choose a different file</span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-7" aria-hidden="true" />
                          <span className="login-upload-text">Choose a JSON file</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="sr-only"
                        aria-labelledby="cloud-key-label"
                        accept=".json"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>

                  <div className="login-field">
                    <label htmlFor="cloud-account-details" className="login-label">Account details</label>
                    <textarea
                      id="cloud-account-details"
                      value={credData.accountDetails}
                      onChange={(e) => updateCred('accountDetails', e.target.value)}
                      placeholder="Production account for project X, owner, notes..."
                      rows="3"
                      className="login-textarea"
                    />
                  </div>

                  <div className="login-field">
                    <label htmlFor="cloud-key-json" className="login-label">Or paste JSON content</label>
                    <textarea
                      id="cloud-key-json"
                      value={credData.rawFileContent}
                      onChange={(e) => updateCred('rawFileContent', e.target.value)}
                      placeholder='{ "type": "service_account", "project_id": "...", ... }'
                      rows="4"
                      className="login-textarea"
                    />
                  </div>
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}

                <div className="login-form-actions">
                  <button onClick={() => setStep(1)} className="brand-button brand-button-outline">
                    Back
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={!isStep2Valid || isSubmitting}
                    className="brand-button brand-button-primary login-btn-next"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</>
                    ) : (
                      'Complete setup'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
