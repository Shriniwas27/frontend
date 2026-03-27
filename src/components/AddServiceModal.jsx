import React, { useState, useEffect } from 'react';
import { registerService, getGlobalGcpProjects, getGlobalGcpServices } from '../api';
import { 
  XCircle, 
  ChevronLeft, 
  Zap, 
  Clock, 
  Plus, 
  Bell, 
  Mail, 
  Calendar,
  Eye,
  Bot,
  RotateCcw,
  LayoutGrid,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Cloud,
  Server
} from 'lucide-react';

const STEPS = ['Cloud Target', 'Identity', 'Guardrails', 'Topology', 'Alerts'];

const InputField = ({ label, isDark, ...props }) => (
  <div>
    <label className={`text-sm font-bold mb-1.5 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
    <input 
      className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
        isDark ? 'bg-gray-900 border-dark-border text-white focus:ring-emerald-accent/20 focus:border-emerald-accent' : 'bg-white border-gray-300 text-gray-900 focus:ring-google-blue/10 focus:border-google-blue'
      }`}
      {...props}
    />
  </div>
);

const DropdownField = ({ label, isDark, icon: Icon, options, value, onChange, placeholder, loading }) => (
  <div>
    <label className={`text-sm font-bold mb-1.5 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
      <select
        value={value}
        onChange={onChange}
        disabled={loading}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-10 border rounded-lg p-3 text-sm focus:outline-none appearance-none transition-all ${
          isDark 
            ? 'bg-gray-900 border-dark-border text-white focus:ring-emerald-accent/20 focus:border-emerald-accent disabled:opacity-50' 
            : 'bg-white border-gray-300 text-gray-900 focus:ring-google-blue/10 focus:border-google-blue disabled:opacity-50'
        }`}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />}
    </div>
  </div>
);

const ToggleSwitch = ({ enabled, onClick, isDark }) => (
  <div 
    onClick={onClick}
    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${
      enabled ? (isDark ? 'bg-emerald-accent' : 'bg-google-blue') : (isDark ? 'bg-gray-800' : 'bg-gray-300')
    }`}
  >
    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${enabled ? 'ml-auto' : 'ml-0'}`}></div>
  </div>
);

const defaultFormData = {
  gcpProject: '',
  microserviceName: '',
  agentName: '',
  activityWindow: '24/7',
  startTime: '09:00',
  endTime: '17:00',
  operationMode: 'observation',
  permissions: {
    restartService: false,
    rollbackVersion: false,
    horizontalScaling: false,
  },
  dependencyAgentId: '',
  dependencyNote: '',
  notificationsEnabled: true,
  email: '',
  restriction: 'No Restrictions',
};

const AddServiceModal = ({ isOpen, onClose, theme, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [projects, setProjects] = useState([]);
  const [cloudServices, setCloudServices] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.gcpProject && isOpen) {
      fetchCloudServices(formData.gcpProject);
    } else {
      setCloudServices([]);
    }
  }, [formData.gcpProject, isOpen]);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const res = await getGlobalGcpProjects();
      if (res.data?.success && res.data.data) {
        setProjects(res.data.data.map(p => ({ label: p, value: p })));
        if (res.data.data.length === 1) {
          updateField('gcpProject', res.data.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch GCP projects", err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchCloudServices = async (projectId) => {
    setIsLoadingServices(true);
    try {
      const res = await getGlobalGcpServices(projectId);
      if (res.data?.success && res.data.data) {
        setCloudServices(res.data.data.map(s => ({ label: s, value: s })));
      }
    } catch (err) {
      console.error("Failed to fetch Cloud Run services for project", err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));
  const updatePermission = (key) => setFormData(prev => ({
    ...prev,
    permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
  }));

  const handleInitialize = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await registerService(formData); // rawFileContent is dynamically obtained in the backend
      onSuccess(`Agent "${formData.agentName || 'Nexus'}" for "${formData.microserviceName || 'Service'}" initialized!`);
      onClose();
      setStep(1);
      setFormData(defaultFormData);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err.message || 'Submission failed';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const permissionItems = [
    { key: 'restartService', icon: RefreshCw, label: 'Restart Service', desc: 'Good for memory leaks or hung processes.' },
    { key: 'rollbackVersion', icon: RotateCcw, label: 'Rollback Version', desc: 'Best if a new deployment caused a 100% failure rate.' },
    { key: 'horizontalScaling', icon: LayoutGrid, label: 'Horizontal Scaling', desc: 'If CPU/RAM is high, add more instances.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all ${
        isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
      }`}>

        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-dark-border' : 'border-gray-100'}`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Register AI Health Agent</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Scalable self-healing infrastructure configuration</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className={`flex items-center justify-between p-3 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
          {STEPS.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-2 cursor-pointer" onClick={() => s < step && setStep(s)}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  step === s ? (isDark ? 'bg-emerald-accent text-dark-bg' : 'bg-google-blue text-white') :
                  step > s ? (isDark ? 'bg-emerald-accent/20 text-emerald-accent' : 'bg-green-100 text-green-600') :
                  (isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-400')
                }`}>{s}</div>
                <span className={`text-[10px] font-bold hidden sm:inline uppercase tracking-tight ${
                  step === s ? (isDark ? 'text-white' : 'text-gray-900') : 'text-gray-400'
                }`}>{label}</span>
                {s < 5 && <div className={`w-4 h-px mx-1 invisible sm:visible ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-8 min-h-[370px] overflow-y-auto">

          {/* Step 1: Cloud Target (Replaced Credentials) */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-google-blue/10 border border-google-blue/30 rounded-xl p-4 flex gap-4 text-sm text-google-blue font-medium mb-4">
                Global GCP credentials are automatically inherited for this new agent. Select the target cloud resources below.
              </div>

              <DropdownField 
                label="GCP Project ID" 
                isDark={isDark} 
                icon={Cloud}
                value={formData.gcpProject}
                onChange={(e) => {
                  updateField('gcpProject', e.target.value);
                  updateField('microserviceName', ''); 
                }}
                placeholder="Select a GCP Project"
                options={projects}
                loading={isLoadingProjects}
              />
              <DropdownField 
                label="Cloud Run Service" 
                isDark={isDark} 
                icon={Server}
                value={formData.microserviceName}
                onChange={(e) => updateField('microserviceName', e.target.value)}
                placeholder="Select a Service"
                options={cloudServices}
                loading={isLoadingServices}
              />
            </div>
          )}

          {/* Step 2: Identity & Schedule */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <InputField label="Agent Name" isDark={isDark} placeholder="e.g., Nexus-Prime" value={formData.agentName} onChange={(e) => updateField('agentName', e.target.value)} />
              <div>
                <label className={`text-sm font-bold mb-1.5 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Agent Activity Window</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ id: '24/7', icon: Zap, label: '24/7 Active' }, { id: 'Custom Slot', icon: Clock, label: 'Custom Slot' }].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateField('activityWindow', opt.id)}
                      className={`flex items-center justify-center gap-2 p-3 border rounded-xl text-sm font-bold transition-all ${
                        formData.activityWindow === opt.id
                          ? (isDark ? 'bg-emerald-accent/20 border-emerald-accent text-white' : 'bg-google-blue/10 border-google-blue text-google-blue')
                          : (isDark ? 'bg-gray-900 border-dark-border text-gray-400 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300')
                      }`}
                    >
                      <opt.icon className="w-4 h-4" /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.activityWindow === 'Custom Slot' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <InputField 
                    label="Start Time" 
                    type="time" 
                    isDark={isDark} 
                    value={formData.startTime} 
                    onChange={(e) => updateField('startTime', e.target.value)} 
                  />
                  <InputField 
                    label="End Time" 
                    type="time" 
                    isDark={isDark} 
                    value={formData.endTime} 
                    onChange={(e) => updateField('endTime', e.target.value)} 
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Guardrails */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Operation Mode</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'observation', icon: Eye, label: 'Observation Mode', desc: 'Read-only. Agent alerts and explains only.' },
                    { id: 'autonomous', icon: Bot, label: 'Autonomous Mode', desc: 'Active. Agent can execute fixes.' },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => updateField('operationMode', mode.id)}
                      className={`flex flex-col items-start gap-1.5 p-4 border rounded-xl text-left transition-all ${
                        formData.operationMode === mode.id
                          ? (isDark ? 'bg-emerald-accent/10 border-emerald-accent' : 'bg-google-blue/5 border-google-blue')
                          : (isDark ? 'bg-gray-900 border-dark-border hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300')
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <mode.icon className={`w-4 h-4 ${formData.operationMode === mode.id ? (isDark ? 'text-emerald-accent' : 'text-google-blue') : 'text-gray-400'}`} />
                        <span className={`text-sm font-bold ${formData.operationMode === mode.id ? (isDark ? 'text-white' : 'text-gray-900') : 'text-gray-500'}`}>{mode.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 pl-6">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`transition-all duration-300 ${formData.operationMode === 'autonomous' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Action Permissions <span className="normal-case font-medium">(Autonomous only)</span>
                </h3>
                <div className="space-y-3">
                  {permissionItems.map(({ key, icon: Icon, label, desc }) => (
                    <div
                      key={key}
                      onClick={() => updatePermission(key)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        formData.permissions[key]
                          ? (isDark ? 'bg-emerald-accent/5 border-emerald-accent/40' : 'bg-google-blue/5 border-google-blue/40')
                          : (isDark ? 'bg-gray-900/50 border-dark-border hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300')
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                        formData.permissions[key]
                          ? (isDark ? 'bg-emerald-accent border-emerald-accent' : 'bg-google-blue border-google-blue')
                          : (isDark ? 'border-gray-600' : 'border-gray-300')
                      }`}>
                        {formData.permissions[key] && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${formData.permissions[key] ? (isDark ? 'text-emerald-accent' : 'text-google-blue') : 'text-gray-500'}`} />
                        <div>
                          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Topology */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center">
                <h3 className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Agent Dependencies</h3>
                <button className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-emerald-accent hover:text-emerald-400' : 'text-google-blue hover:opacity-80'} transition-opacity`}>
                  <Plus className="w-3 h-3" /> ADD DEPENDENCY
                </button>
              </div>
              <div className={`p-5 rounded-xl border space-y-4 ${isDark ? 'bg-gray-900/80 border-dark-border' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Target Agent ID</label>
                  <input
                    type="text"
                    value={formData.dependencyAgentId}
                    onChange={(e) => updateField('dependencyAgentId', e.target.value)}
                    placeholder="nexus-v3-cluster"
                    className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none transition-all ${
                      isDark ? 'bg-dark-bg border-dark-border text-white focus:border-emerald-accent' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-google-blue'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Relationship Note</label>
                  <textarea
                    value={formData.dependencyNote}
                    onChange={(e) => updateField('dependencyNote', e.target.value)}
                    placeholder="Describe relationship (e.g., Critical DB link)"
                    rows="3"
                    className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none resize-none transition-all ${
                      isDark ? 'bg-dark-bg border-dark-border text-white focus:border-emerald-accent' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-google-blue'
                    }`}
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Alerts */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div
                onClick={() => updateField('notificationsEnabled', !formData.notificationsEnabled)}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none ${
                  isDark ? 'bg-gray-900/50 border-dark-border hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className={isDark ? 'text-emerald-accent' : 'text-google-blue'} />
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Enable Notifications</p>
                    <p className="text-xs text-gray-500">Receive alerts on self-healing events</p>
                  </div>
                </div>
                <ToggleSwitch enabled={formData.notificationsEnabled} onClick={() => {}} isDark={isDark} />
              </div>

              <div className={`space-y-4 transition-all duration-300 ${formData.notificationsEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-bold mb-1.5 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="admin@cybermedic.ai"
                        className={`w-full pl-10 border rounded-lg p-2.5 text-sm focus:outline-none transition-all ${
                          isDark ? 'bg-gray-900 border-dark-border text-white focus:border-emerald-accent' : 'bg-white border-gray-300 text-gray-900 focus:border-google-blue'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-bold mb-1.5 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Alert Restriction</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select
                        value={formData.restriction}
                        onChange={(e) => updateField('restriction', e.target.value)}
                        className={`w-full pl-10 border rounded-lg p-2.5 text-sm focus:outline-none appearance-none transition-all ${
                          isDark ? 'bg-gray-900 border-dark-border text-white focus:border-emerald-accent' : 'bg-white border-gray-300 text-gray-900 focus:border-google-blue'
                        }`}
                      >
                        <option>No Restrictions</option>
                        <option>Business Hours Only</option>
                        <option>Weekend Exclusion</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-rose-accent/10 border border-rose-accent/30 text-rose-accent text-xs font-semibold">
                  ⚠ {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-5 border-t flex justify-between items-center ${isDark ? 'border-dark-border bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
          <button
            disabled={step === 1}
            onClick={() => setStep(s => s - 1)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              step === 1 ? 'opacity-30 cursor-not-allowed text-gray-500' : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> PREVIOUS
          </button>

          <div className="text-xs text-gray-500 font-mono">{step} / {STEPS.length}</div>

          <button
            onClick={() => step < 5 ? setStep(s => s + 1) : handleInitialize()}
            disabled={isSubmitting || (step === 1 && (!formData.gcpProject || !formData.microserviceName))}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 ${
              isDark ? 'bg-emerald-accent text-dark-bg shadow-emerald-accent/20' : 'bg-google-blue text-white shadow-google-blue/20'
            }`}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Initializing...</> : step === 5 ? 'INITIALIZE SYSTEM' : 'NEXT STEP →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceModal;
