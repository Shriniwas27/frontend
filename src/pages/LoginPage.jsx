import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  Upload, 
  User, 
  Mail, 
  Phone, 
  Loader2,
  ChevronLeft,
  Cloud,
  CheckCircle2,
  Lock,
  KeyRound
} from 'lucide-react';
import { register, login, createAccount, clearAuthSession, storeAuthSession } from '../api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
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
    <div className="login-page">
      {/* Background */}
      <div className="login-bg">
        <div className="login-bg-pattern"></div>
      </div>

      {/* Back to Landing */}
      <button onClick={() => navigate('/')} className="login-back-btn">
        <ChevronLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="login-container">
        {/* Left Panel - Branding */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <div className="login-brand-logo">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="login-brand-title">CyberMedic AI</h1>
            <p className="login-brand-subtitle">Self-Healing Infrastructure Platform</p>
            
            <div className="login-brand-features">
              {[
                'AI-powered incident response',
                'Multi-project GCP management',
                'Real-time service monitoring',
                'Autonomous healing agents'
              ].map((f, i) => (
                <div key={i} className="login-brand-feature">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="login-form-panel">
          <div className="login-form-content">
            {/* Step indicator */}
            <div className="login-steps-indicator">
              <div className={`login-step-dot ${step >= 1 ? 'active' : ''}`}>
                <User className="w-3.5 h-3.5" />
              </div>
              <div className={`login-step-line ${step >= 2 ? 'active' : ''}`}></div>
              <div className={`login-step-dot ${step >= 2 ? 'active' : ''}`}>
                <Cloud className="w-3.5 h-3.5" />
              </div>
            </div>

            {step === 1 && (
              <div className="login-form-step">
                <div className="login-form-header">
                  <h2 className="login-form-title">
                    {authMode === 'register' ? 'Create your account' : 'Welcome back'}
                  </h2>
                  <p className="login-form-desc">
                    {authMode === 'register' 
                      ? 'Tell us about yourself to personalize your experience.' 
                      : 'Sign in with your credentials to access your dashboard.'}
                  </p>
                </div>

                <div className="login-form-fields">
                  {authMode === 'register' && (
                    <div className="login-field">
                      <label className="login-label">Full Name</label>
                      <div className="login-input-wrapper">
                        <User className="login-input-icon" />
                        <input
                          type="text"
                          value={userData.name}
                          onChange={(e) => updateUser('name', e.target.value)}
                          placeholder="Josh Doe"
                          className="login-input"
                        />
                      </div>
                    </div>
                  )}

                  <div className="login-field">
                    <label className="login-label">Email Address</label>
                    <div className="login-input-wrapper">
                      <Mail className="login-input-icon" />
                      <input
                        type="email"
                        value={userData.email}
                        onChange={(e) => updateUser('email', e.target.value)}
                        placeholder="josh@example.com"
                        className="login-input"
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label className="login-label">Password</label>
                    <div className="login-input-wrapper">
                      <KeyRound className="login-input-icon" />
                      <input
                        type="password"
                        value={userData.password}
                        onChange={(e) => updateUser('password', e.target.value)}
                        placeholder="••••••••"
                        className="login-input"
                      />
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div className="login-field">
                      <label className="login-label">Contact Number (Optional)</label>
                      <div className="login-input-wrapper">
                        <Phone className="login-input-icon" />
                        <input
                          type="tel"
                          value={userData.contactNumber}
                          onChange={(e) => updateUser('contactNumber', e.target.value)}
                          placeholder="+91 98765 43210"
                          className="login-input"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {error && <div className="login-error">⚠ {error}</div>}

                <button 
                  onClick={handleAuth}
                  disabled={!isStep1Valid || isSubmitting}
                  className="login-btn-next"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    authMode === 'register' ? <>Continue <ArrowRight className="w-4 h-4" /></> : <>Sign In <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="login-switch-mode">
                  {authMode === 'register' ? (
                    <p>Already have an account? <button onClick={() => { clearAuthSession(); setAuthMode('login'); setError(null); }}>Sign In</button></p>
                  ) : (
                    <p>New to CyberMedic? <button onClick={() => { clearAuthSession(); setAuthMode('register'); setError(null); }}>Create Account</button></p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="login-form-step">
                <div className="login-form-header">
                  <h2 className="login-form-title">Connect your cloud</h2>
                  <p className="login-form-desc">Upload your GCP service account key to get started.</p>
                </div>

                <div className="login-form-fields">
                  <div className="login-field">
                    <label className="login-label">Account Name</label>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon" />
                      <input
                        type="text"
                        value={credData.credentialName}
                        onChange={(e) => updateCred('credentialName', e.target.value)}
                        placeholder="Production GCP Account"
                        className="login-input"
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label className="login-label">Service Account Key (JSON)</label>
                    <div 
                      onClick={() => document.getElementById('login-json-upload').click()}
                      className={`login-upload-zone ${credData.rawFileContent ? 'has-file' : ''}`}
                    >
                      {credData.rawFileContent ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <p className="login-upload-text success">Credentials loaded successfully</p>
                          <p className="login-upload-hint">Click to replace file</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="login-upload-text">Drop your credentials.json here or click to browse</p>
                          <p className="login-upload-hint">Supports .json service account keys</p>
                        </>
                      )}
                      <input 
                        id="login-json-upload" 
                        type="file" 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleFileUpload} 
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label className="login-label">Account Details</label>
                    <textarea
                      value={credData.accountDetails}
                      onChange={(e) => updateCred('accountDetails', e.target.value)}
                      placeholder="Production account for project X, owner, notes..."
                      rows="3"
                      className="login-textarea"
                    />
                  </div>

                  <div className="login-field">
                    <label className="login-label">Or paste JSON content</label>
                    <textarea
                      value={credData.rawFileContent}
                      onChange={(e) => updateCred('rawFileContent', e.target.value)}
                      placeholder='{ "type": "service_account", "project_id": "...", ... }'
                      rows="4"
                      className="login-textarea"
                    />
                  </div>
                </div>

                {error && <div className="login-error">⚠ {error}</div>}

                <div className="login-form-actions">
                  <button onClick={() => setStep(1)} className="login-btn-back">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button 
                    onClick={handleFinalSubmit}
                    disabled={!isStep2Valid || isSubmitting}
                    className="login-btn-next"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</>
                    ) : (
                      <>Complete Setup <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
