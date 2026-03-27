import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Terminal,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Share2,
  Upload,
  Loader2
} from 'lucide-react';

// --- Modular Components ---
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import MetricCard from './components/MetricCard';
import ServiceCard from './components/ServiceCard';
import AddServiceModal from './components/AddServiceModal';
import ConfigureServiceModal from './components/ConfigureServiceModal';
import Toast from './components/Toast';

// --- API ---
import { getServices, deleteService, updateServiceStatus, checkGlobalCredentials, saveGlobalCredentials } from './api';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const [toast, setToast] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Global Setup State
  const [hasGlobalCreds, setHasGlobalCreds] = useState(true); // default true while checking
  const [isCheckingCreds, setIsCheckingCreds] = useState(true);
  const [setupCreds, setSetupCreds] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  const [logs, setLogs] = useState([
    { id: 1, time: '12:44:02', agent: 'Nexus-Prime', action: 'Detected 504 on Auth-Service. Applying Horizontal Scale...', status: 'success' },
    { id: 2, time: '12:45:15', agent: 'Sentinel-V3', action: 'Latency spike in Payment-Gate. Rerouting traffic to DB-Clone-02.', status: 'success' },
    { id: 3, time: '12:48:30', agent: 'Astra-09', action: 'Suspicious payload detected in User-Profile-Sync. Blocking IP block 45.x.x.x', status: 'warning' },
    { id: 4, time: '12:50:01', agent: 'Nexus-Prime', action: 'Microservice recovery complete. Scaling back pods to baseline.', status: 'success' },
    { id: 5, time: '12:51:12', agent: 'Cyber-Medic', action: 'Memory leak detected in Search-Index. Scheduled graceful restart.', status: 'success' }
  ]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
    showToast(`Switched to ${newTheme.toUpperCase()} mode`, 'info');
  };

  const checkSetup = async () => {
    try {
      setIsCheckingCreds(true);
      const res = await checkGlobalCredentials();
      if (res.data?.success) {
        setHasGlobalCreds(res.data.hasCredentials);
        if (res.data.hasCredentials) {
          fetchServices();
        }
      }
    } catch (err) {
      console.error(err);
      setHasGlobalCreds(false); // If fail to check backend, assume false to trigger setup
    } finally {
      setIsCheckingCreds(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
    checkSetup();
  }, []);

  const handleSaveCredentials = async () => {
    if (!setupCreds) {
      showToast('Please provide valid GCP credentials content.', 'error');
      return;
    }
    
    setIsSavingCreds(true);
    try {
      const res = await saveGlobalCredentials({ rawFileContent: setupCreds });
      if (res.data?.success) {
        showToast('Account setup complete!', 'success');
        setHasGlobalCreds(true);
        fetchServices();
      }
    } catch (err) {
      showToast('Failed to save credentials. Make sure backend is running.', 'error');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSetupCreds(event.target.result);
    };
    reader.readAsText(file);
  };

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const res = await getServices();
      if (res.data?.success) {
        setServices(res.data.data);
      }
    } catch (err) {
      showToast('Failed to fetch services', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action, service) => {
    if (action === 'Configure') {
      setSelectedService(service);
      setIsConfigOpen(true);
    } else if (action === 'Delete') {
      if (!window.confirm(`Are you sure you want to delete ${service.microserviceName}?`)) return;
      try {
        await deleteService(service.id);
        showToast(`Service deleted successfully`, 'success');
        fetchServices();
      } catch (err) {
        showToast('Failed to delete service', 'error');
      }
    } else if (action === 'ToggleStatus') {
      const newStatus = service.status === 'Down' ? 'Operational' : 'Down';
      try {
        await updateServiceStatus(service.id, newStatus);
        showToast(`Service is now ${newStatus}`, 'success');
        fetchServices();
      } catch (err) {
        showToast('Failed to update status', 'error');
      }
    }
  };

  const isDark = theme === 'dark';

  const filteredServices = serviceFilter === 'ALL' 
    ? services 
    : services.filter(s => s.status === 'Degraded' || s.status === 'Down');

  if (isCheckingCreds) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDark ? 'bg-dark-bg text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-google-blue" />
          <p className="font-bold tracking-widest text-sm uppercase">Initializing Systems...</p>
        </div>
      </div>
    );
  }

  // First-time Global Account Setup Screen
  if (!hasGlobalCreds) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-dark-bg text-white' : 'bg-gray-50 text-gray-900'} p-6 font-sans selection:bg-google-blue/20 selection:text-google-blue`}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <div className={`max-w-xl w-full border rounded-2xl p-10 shadow-2xl transition-all ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'}`}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black mb-2">Welcome to CyberMedic AI</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Let's set up your global service account to allow agents to interact with your Google Cloud infrastructure securely.</p>
          </div>

          <div className="space-y-6">
            <label className="block">
              <span className={`text-sm font-bold mb-3 block text-center uppercase tracking-widest ${isDark ? 'text-google-blue' : 'text-google-blue'}`}>Provide GCP Service Account Key</span>
              <div 
                onClick={() => document.getElementById('global-json-upload').click()}
                className={`flex justify-center flex-col items-center px-6 pt-10 pb-10 border-2 border-dashed rounded-xl cursor-pointer group transition-all ${
                isDark ? 'border-dark-border bg-gray-900/30 hover:border-google-blue/50' : 'border-gray-200 bg-gray-50 hover:border-google-blue/50'
              }`}>
                <Upload className={`h-10 w-10 mb-4 transition-colors ${isDark ? 'text-gray-500 group-hover:text-google-blue' : 'text-gray-400 group-hover:text-google-blue'}`} />
                <p className="text-sm font-bold mb-1">Upload credentials.json</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This will be securely stored globally for all sub-agents.</p>
                <input id="global-json-upload" type="file" className="hidden" accept=".json,.pem,.yaml" onChange={handleFileChange} />
              </div>
            </label>

            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Or paste content here directly</label>
              <textarea
                value={setupCreds}
                onChange={(e) => setSetupCreds(e.target.value)}
                placeholder='{ "type": "service_account", "project_id": "...", ... }'
                rows="6"
                className={`w-full border rounded-lg p-4 text-xs font-mono focus:outline-none focus:ring-2 transition-all resize-none ${
                  isDark ? 'bg-gray-900 border-dark-border text-white focus:ring-google-blue/20 focus:border-google-blue' : 'bg-white border-gray-300 text-gray-900 focus:ring-google-blue/10 focus:border-google-blue'
                }`}
              />
            </div>

            <button 
              onClick={handleSaveCredentials}
              disabled={isSavingCreds || !setupCreds}
              className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSavingCreds || !setupCreds 
                  ? (isDark ? 'bg-gray-800 text-gray-500 shadow-none cursor-not-allowed' : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed')
                  : 'bg-google-blue text-white shadow-google-blue/20 hover:scale-[1.02]'
              }`}
            >
              {isSavingCreds ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying & Saving...</> : 'COMPLETE SETUP →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className={`flex h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gray-50'} font-sans selection:bg-google-blue/20 selection:text-google-blue overflow-hidden`}>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />

      <main className="flex-1 flex flex-col overflow-hidden">
        
        <TopHeader isDark={isDark} theme={theme} toggleTheme={toggleTheme} />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <div className="flex justify-between items-end mb-8">
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeTab}</h2>
              <p className={isDark ? 'text-gray-500' : 'text-gray-600'}>Real-time observability and self-healing orchestration.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-lg ${
                isDark ? 'bg-emerald-accent text-dark-bg shadow-emerald-accent/20' : 'bg-google-blue text-white shadow-google-blue/20'
              }`}
            >
              <Plus className="w-5 h-5" /> NEW SERVICE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <MetricCard title="Active Agents" value={services.length.toString()} icon={Cpu} color={isDark ? "text-emerald-accent" : "text-google-blue"} theme={theme} />
            <MetricCard title="System Health" value="99.8%" icon={CheckCircle2} color="text-emerald-accent" theme={theme} />
            <MetricCard title="Self-Healing (24h)" value="1.2k" icon={ShieldCheck} color={isDark ? "text-emerald-accent" : "text-green-600"} theme={theme} />
            <MetricCard title="Manual Saves" value="84" icon={Zap} color={isDark ? "text-amber-400" : "text-amber-600"} theme={theme} />
          </div>

          <div className="flex items-center justify-between mb-6">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Microservices</h3>
             <div className="flex gap-2">
                <button 
                  onClick={() => setServiceFilter('ALL')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                    serviceFilter === 'ALL' 
                      ? (isDark ? 'bg-emerald-accent text-dark-bg border-emerald-accent' : 'bg-google-blue text-white border-google-blue')
                      : (isDark ? 'bg-gray-900 border-dark-border text-gray-500 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900')
                  }`}
                >ALL</button>
                <button 
                  onClick={() => setServiceFilter('ISSUES')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                    serviceFilter === 'ISSUES' 
                      ? (isDark ? 'bg-rose-accent text-white border-rose-accent shadow-md shadow-rose-accent/20' : 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20')
                      : (isDark ? 'bg-gray-900 border-dark-border text-gray-500 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900')
                  }`}
                >ISSUES ONLY</button>
             </div>
          </div>

          {!isLoading && filteredServices.length === 0 && (
            <div className={`text-center py-10 rounded-xl border border-dashed ${isDark ? 'border-gray-800 text-gray-600' : 'border-gray-300 text-gray-400'}`}>
              <Cpu className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold">No active microservices found.</p>
              <p className="text-xs mt-1">Click "NEW SERVICE" to register an agent.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 transition-all">
            {filteredServices.map((service, idx) => (
              <div key={service.id} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                <ServiceCard {...service} theme={theme} onAction={(action) => handleAction(action, service)} />
              </div>
            ))}
          </div>

          <div className={`border rounded-2xl p-6 transition-colors ${
            isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Terminal className={isDark ? 'text-emerald-accent' : 'text-google-blue'} />
                <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Event Stream</h3>
              </div>
              <button 
                onClick={() => showToast('Log export started', 'success')}
                className="text-[10px] font-bold text-gray-500 hover:text-emerald-accent transition-colors flex items-center gap-2"
              >
                <Share2 className="w-3 h-3" /> EXPORT
              </button>
            </div>
            
            <div className="space-y-4 font-mono text-xs">
              {logs.map((log) => (
                <div key={log.id} className={`flex gap-4 p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                  <span className="text-gray-500">[{log.time}]</span>
                  <span className={isDark ? 'text-emerald-accent' : 'text-google-blue'}>[{log.agent}]</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{log.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {hasGlobalCreds && (
        <AddServiceModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          theme={theme} 
          onSuccess={(msg) => {
            showToast(msg, 'success');
            fetchServices();
          }} 
        />
      )}

      {/* Configure Modal is kept Full-Screen as implemented previously */}
      <ConfigureServiceModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        service={selectedService}
        theme={theme}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          fetchServices();
        }}
      />
    </div>
  );
}
