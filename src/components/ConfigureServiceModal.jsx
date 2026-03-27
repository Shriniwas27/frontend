import React, { useState, useEffect } from 'react';
import { updateService, getGcpProjects, getGcpServices } from '../api';
import { 
  XCircle, 
  Zap, 
  Clock, 
  Eye,
  Bot,
  RotateCcw,
  LayoutGrid,
  RefreshCw,
  CheckCircle2,
  Bell,
  Mail,
  Calendar,
  Loader2,
  Save,
  Cloud,
  Server
} from 'lucide-react';

const InputField = ({ label, isDark, ...props }) => (
  <div>
    <label className={`text-sm font-bold mb-1.5 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
    <input 
      className={`w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 transition-all ${
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

const ConfigureServiceModal = ({ isOpen, onClose, theme, onSuccess, service }) => {
  const [formData, setFormData] = useState({
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
    notificationsEnabled: true,
    email: '',
    restriction: 'No Restrictions'
  });
  
  const [projects, setProjects] = useState([]);
  const [cloudServices, setCloudServices] = useState([]);
  
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (service && isOpen) {
      setFormData({
        gcpProject: service.gcpProject || '',
        microserviceName: service.microserviceName || '',
        agentName: service.agentName || '',
        activityWindow: service.activityWindow || '24/7',
        startTime: service.startTime || '09:00',
        endTime: service.endTime || '17:00',
        operationMode: service.operationMode || 'observation',
        permissions: {
          restartService: service.permissions?.restartService || false,
          rollbackVersion: service.permissions?.rollbackVersion || false,
          horizontalScaling: service.permissions?.horizontalScaling || false,
        },
        notificationsEnabled: service.notifications?.enabled ?? true,
        email: service.notifications?.email || '',
        restriction: service.notifications?.restriction || 'No Restrictions'
      });

      fetchProjects(service.agentId, service.gcpProject);
    }
  }, [service, isOpen]);

  // When project changes visually, load services
  useEffect(() => {
    if (formData.gcpProject && service?.agentId && isOpen) {
      fetchCloudServices(service.agentId, formData.gcpProject);
    } else {
      setCloudServices([]);
    }
  }, [formData.gcpProject, service, isOpen]);

  const fetchProjects = async (agentId, preselectedProject) => {
    setIsLoadingProjects(true);
    try {
      const res = await getGcpProjects(agentId);
      if (res.data?.success && res.data.data) {
        setProjects(res.data.data.map(p => ({ label: p, value: p })));
        
        // If they didn't have one predefined but we fetched exactly 1 project, select it
        if (!preselectedProject && res.data.data.length === 1) {
          updateField('gcpProject', res.data.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch GCP projects", err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchCloudServices = async (agentId, projectId) => {
    setIsLoadingServices(true);
    try {
      const res = await getGcpServices(agentId, projectId);
      if (res.data?.success && res.data.data) {
        setCloudServices(res.data.data.map(s => ({ label: s, value: s })));
      }
    } catch (err) {
      console.error("Failed to fetch Cloud Run services for project", err);
      // fallback manual input might be required if it fails, but dropdown is strictly asked
    } finally {
      setIsLoadingServices(false);
    }
  };

  if (!isOpen || !service) return null;
  const isDark = theme === 'dark';

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));
  const updatePermission = (key) => setFormData(prev => ({
    ...prev,
    permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
  }));

  const handleUpdate = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateService(service.id, formData);
      onSuccess(`Agent "${formData.agentName || service.agentName}" configured successfully!`);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err.message || 'Update failed';
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
    <div className={`fixed inset-0 z-50 flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-dark-bg selection:bg-google-blue/20 selection:text-google-blue' : 'bg-gray-50'}`}>
      
      {/* Top Header */}
      <div className={`flex items-center justify-between px-8 py-5 border-b shadow-sm ${isDark ? 'border-dark-border bg-dark-card' : 'border-gray-200 bg-white'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Configuration Profile
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Agent ID: <span className="font-mono">{service.agentId}</span></p>
        </div>
        <div className="flex gap-4">
          <button onClick={onClose} disabled={isSubmitting} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-200'
          }`}>
            Cancel Stop
          </button>
          <button onClick={handleUpdate} disabled={isSubmitting} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg disabled:opacity-60 transition-all ${
            isDark ? 'bg-emerald-accent text-dark-bg shadow-emerald-accent/20 hover:scale-105' : 'bg-google-blue text-white shadow-google-blue/20 hover:scale-105'
          }`}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving Configuration...</> : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {submitError && (
            <div className="p-4 rounded-xl bg-rose-accent/10 border border-rose-accent/30 text-rose-accent text-sm font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {submitError}
            </div>
          )}

          {/* GCP Integration */}
          <section className={`p-8 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border shadow-lg shadow-black/20' : 'bg-white border-gray-200 shadow-sm'}`}>
             <h2 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}>Cloud Target Integration</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DropdownField 
                  label="GCP Project ID" 
                  isDark={isDark} 
                  icon={Cloud}
                  value={formData.gcpProject}
                  onChange={(e) => {
                    updateField('gcpProject', e.target.value);
                    updateField('microserviceName', ''); // reset service when project changes
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
          </section>

          {/* Identity & Schedule */}
          <section className={`p-8 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border shadow-lg shadow-black/20' : 'bg-white border-gray-200 shadow-sm'}`}>
             <h2 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Agent Identity & Schedule</h2>
             <div className="space-y-6">
                <InputField label="Assigned Agent Name" isDark={isDark} placeholder="e.g., Nexus-Prime" value={formData.agentName} onChange={(e) => updateField('agentName', e.target.value)} />
                
                <div>
                  <label className={`text-sm font-bold mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Agent Activity Window</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[{ id: '24/7', icon: Zap, label: '24/7 Active' }, { id: 'Custom Slot', icon: Clock, label: 'Custom Time Slot' }].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => updateField('activityWindow', opt.id)}
                        className={`flex items-center justify-center gap-3 p-4 border rounded-xl text-sm font-bold transition-all ${
                          formData.activityWindow === opt.id
                            ? (isDark ? 'bg-emerald-accent/20 border-emerald-accent text-white' : 'bg-google-blue/10 border-google-blue text-google-blue')
                            : (isDark ? 'bg-gray-900 border-dark-border text-gray-400 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300')
                        }`}
                      >
                        <opt.icon className="w-5 h-5" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.activityWindow === 'Custom Slot' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 p-6 rounded-xl border border-dashed border-gray-600/50 bg-black/10">
                    <InputField label="Start Time" type="time" isDark={isDark} value={formData.startTime} onChange={(e) => updateField('startTime', e.target.value)} />
                    <InputField label="End Time" type="time" isDark={isDark} value={formData.endTime} onChange={(e) => updateField('endTime', e.target.value)} />
                  </div>
                )}
             </div>
          </section>

          {/* Operational Guardrails */}
          <section className={`p-8 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border shadow-lg shadow-black/20' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h2 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Execution Guardrails</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'observation', icon: Eye, label: 'Observation Mode', desc: 'Read-only alerts with explanations.' },
                  { id: 'autonomous', icon: Bot, label: 'Autonomous Mode', desc: 'Agent actively executes safe fixes.' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => updateField('operationMode', mode.id)}
                    className={`flex flex-col items-start gap-2 p-5 border rounded-xl text-left transition-all ${
                      formData.operationMode === mode.id
                        ? (isDark ? 'bg-emerald-accent/10 border-emerald-accent shadow-md shadow-emerald-accent/10' : 'bg-google-blue/5 border-google-blue shadow-md')
                        : (isDark ? 'bg-gray-900 border-dark-border hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <mode.icon className={`w-5 h-5 ${formData.operationMode === mode.id ? (isDark ? 'text-emerald-accent' : 'text-google-blue') : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${formData.operationMode === mode.id ? (isDark ? 'text-white' : 'text-gray-900') : 'text-gray-500'}`}>{mode.label}</span>
                    </div>
                    <p className={`text-xs pl-8 mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{mode.desc}</p>
                  </button>
                ))}
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${formData.operationMode === 'autonomous' ? 'max-h-[500px] opacity-100 mt-8' : 'max-h-0 opacity-0'}`}>
                  <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`}>Granted Action Permissions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissionItems.map(({ key, icon: Icon, label, desc }) => (
                      <div key={key} onClick={() => updatePermission(key)} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                          formData.permissions[key] ? (isDark ? 'bg-emerald-accent/5 border-emerald-accent/50' : 'bg-google-blue/5 border-google-blue/50') : (isDark ? 'bg-gray-900/50 border-dark-border hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300')
                        }`}>
                        <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                          formData.permissions[key] ? (isDark ? 'bg-emerald-accent border-emerald-accent' : 'bg-google-blue border-google-blue') : (isDark ? 'border-gray-600' : 'border-gray-300')
                        }`}>
                          {formData.permissions[key] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${formData.permissions[key] ? (isDark ? 'text-emerald-accent' : 'text-google-blue') : 'text-gray-500'}`} />
                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                          </div>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </section>

          {/* Incident Alerts */}
          <section className={`p-8 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border shadow-lg shadow-black/20' : 'bg-white border-gray-200 shadow-sm'}`}>
              <h2 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Incident Notifications</h2>
              <div className="space-y-6">
                <div onClick={() => updateField('notificationsEnabled', !formData.notificationsEnabled)} className={`flex items-center justify-between p-5 rounded-xl border cursor-pointer transition-all ${
                    isDark ? 'bg-gray-900/50 border-dark-border hover:bg-gray-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                      <Bell className={`w-5 h-5 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>System Wide Alerts</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receive prompt notifications for scaling overrides and resets</p>
                    </div>
                  </div>
                  <ToggleSwitch enabled={formData.notificationsEnabled} onClick={() => {}} isDark={isDark} />
                </div>

                <div className={`transition-all duration-300 overflow-hidden ${formData.notificationsEnabled ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className={`text-xs font-bold mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Email Directory</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="alert-ops@domain.com"
                          className={`w-full pl-10 border rounded-lg p-3 text-sm focus:outline-none transition-all ${
                            isDark ? 'bg-gray-900 border-dark-border text-white focus:border-emerald-accent' : 'bg-white border-gray-300 text-gray-900 focus:border-google-blue'
                          }`} />
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-bold mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Schedule Constraint</label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <select value={formData.restriction} onChange={(e) => updateField('restriction', e.target.value)}
                          className={`w-full pl-10 border rounded-lg p-3 text-sm focus:outline-none appearance-none transition-all ${
                            isDark ? 'bg-gray-900 border-dark-border text-white focus:border-emerald-accent' : 'bg-white border-gray-300 text-gray-900 focus:border-google-blue'
                          }`}>
                          <option>No Restrictions</option>
                          <option>Business Hours Only (9AM-5PM)</option>
                          <option>Weekend Exclusions</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </section>

          {/* Spacer */}
          <div className="h-10"></div>
        </div>
      </div>
    </div>
  );
};

export default ConfigureServiceModal;
