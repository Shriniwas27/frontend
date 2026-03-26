import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Terminal,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Share2
} from 'lucide-react';

// --- Modular Components ---
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import MetricCard from './components/MetricCard';
import ServiceCard from './components/ServiceCard';
import AddServiceModal from './components/AddServiceModal';
import Toast from './components/Toast';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [logs, setLogs] = useState([
    { id: 1, time: '12:44:02', agent: 'Nexus-Prime', action: 'Detected 504 on Auth-Service. Applying Horizontal Scale...', status: 'success' },
    { id: 2, time: '12:45:15', agent: 'Sentinel-V3', action: 'Latency spike in Payment-Gate. Rerouting traffic to DB-Clone-02.', status: 'success' },
    { id: 3, time: '12:48:30', agent: 'Astra-09', action: 'Suspicious payload detected in User-Profile-Sync. Blocking IP block 45.x.x.x', status: 'warning' },
    { id: 4, time: '12:50:01', agent: 'Nexus-Prime', action: 'Microservice recovery complete. Scaling back pods to baseline.', status: 'success' },
    { id: 5, time: '12:51:12', agent: 'Cyber-Medic', action: 'Memory leak detected in Search-Index. Scheduled graceful restart.', status: 'success' }
  ]);

  const services = [
    { name: 'Payment Gateway', status: 'Operational', agent: 'Nexus-Prime', version: '2.4.1', latency: 42 },
    { name: 'Auth Service', status: 'Degraded', agent: 'Sentinel-V3', version: '1.0.9', latency: 156 },
    { name: 'Search Cluster', status: 'Operational', agent: 'Astra-09', version: '3.2.0', latency: 28 },
    { name: 'User Profile Sync', status: 'Operational', agent: 'Cyber-Medic', version: '1.5.0', latency: 64 },
    { name: 'Inventory DB', status: 'Down', agent: 'Data-Warden', version: '2.0.1', latency: 999 },
    { name: 'Edge CDN', status: 'Operational', agent: 'Cloud-Guard', version: '4.1.2', latency: 12 }
  ];

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

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const isDark = theme === 'dark';

  const filteredServices = serviceFilter === 'ALL' 
    ? services 
    : services.filter(s => s.status === 'Degraded' || s.status === 'Down');

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
            <MetricCard title="Active Agents" value="24" icon={Cpu} color={isDark ? "text-emerald-accent" : "text-google-blue"} theme={theme} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 transition-all">
            {filteredServices.map((service, idx) => (
              <div key={service.name} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                <ServiceCard {...service} theme={theme} onAction={(action) => showToast(`${action} for ${service.name}`, 'info')} />
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

      <AddServiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        theme={theme} 
        onSuccess={(msg) => showToast(msg, 'success')} 
      />
    </div>
  );
}
