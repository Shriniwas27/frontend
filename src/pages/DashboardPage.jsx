import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Terminal,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Share2,
  Loader2,
  Search,
  Filter,
  FolderOpen,
  Grid3X3,
  List,
  ChevronDown
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import MetricCard from '../components/MetricCard';
import ServiceCard from '../components/ServiceCard';
import AddServiceModal from '../components/AddServiceModal';
import ConfigureServiceModal from '../components/ConfigureServiceModal';
import GroupManager from '../components/GroupManager';
import Toast from '../components/Toast';

import { getServices, deleteService, updateServiceStatus, getGroups } from '../api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('flat'); // 'flat' | 'grouped'

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const [toast, setToast] = useState(null);
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // User info from localStorage
  const [currentUser, setCurrentUser] = useState(null);

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

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add('light');
    
    // Load user
    const storedUser = localStorage.getItem('cybermedic_user');
    if (storedUser) {
      try { setCurrentUser(JSON.parse(storedUser)); } catch {}
    }

    fetchServices();
    fetchGroups();
  }, []);

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

  const fetchGroups = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('cybermedic_user') || '{}')?.id;
      if (userId) {
        const res = await getGroups(userId);
        if (res.data?.success) {
          setGroups(res.data.data);
        }
      }
    } catch {
      // Groups are optional; silently handle
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

  // Get unique projects from services
  const uniqueProjects = useMemo(() => {
    const projects = [...new Set(services.map(s => s.gcpProject).filter(Boolean))];
    return projects;
  }, [services]);

  // Filtered & searched services
  const filteredServices = useMemo(() => {
    let result = services;
    
    // Status filter
    if (serviceFilter === 'ISSUES') {
      result = result.filter(s => s.status === 'Degraded' || s.status === 'Down');
    } else if (serviceFilter === 'Operational') {
      result = result.filter(s => s.status === 'Operational');
    }
    
    // Project filter
    if (projectFilter !== 'ALL') {
      result = result.filter(s => s.gcpProject === projectFilter);
    }
    
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.microserviceName?.toLowerCase().includes(q) ||
        s.agentName?.toLowerCase().includes(q) ||
        s.gcpProject?.toLowerCase().includes(q) ||
        s.agentId?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [services, serviceFilter, projectFilter, searchQuery]);

  // Recent services (last 3 registered)
  const recentServices = useMemo(() => {
    return [...services]
      .sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0))
      .slice(0, 3);
  }, [services]);

  // Group services by project for grouped view
  const groupedByProject = useMemo(() => {
    const grouped = {};
    filteredServices.forEach(s => {
      const key = s.gcpProject || 'Unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }, [filteredServices]);

  // Group services by custom groups
  const customGroupedServices = useMemo(() => {
    const result = {};
    groups.forEach(g => {
      result[g.id] = {
        ...g,
        services: filteredServices.filter(s => g.serviceIds?.includes(s.id))
      };
    });
    // Ungrouped services
    const allGroupedIds = groups.flatMap(g => g.serviceIds || []);
    const ungrouped = filteredServices.filter(s => !allGroupedIds.includes(s.id));
    if (ungrouped.length > 0) {
      result['ungrouped'] = { name: 'Ungrouped Services', type: 'other', color: '#9ca3af', services: ungrouped };
    }
    return result;
  }, [filteredServices, groups]);

  const handleLogout = () => {
    localStorage.removeItem('cybermedic_user');
    localStorage.removeItem('cybermedic_token');
    navigate('/');
  };

  return (
    <div className={`flex h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-gray-50'} font-sans selection:bg-google-blue/20 selection:text-google-blue overflow-hidden`}>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme}
        currentUser={currentUser}
        groups={groups}
        onLogout={handleLogout}
        onManageGroups={() => setIsGroupManagerOpen(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        
        <TopHeader 
          isDark={isDark} 
          theme={theme} 
          toggleTheme={toggleTheme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <div className="flex justify-between items-end mb-8">
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeTab}</h2>
              <p className={isDark ? 'text-gray-500' : 'text-gray-600'}>Real-time observability and self-healing orchestration.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsGroupManagerOpen(true)}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border ${
                  isDark ? 'border-dark-border text-gray-400 hover:text-white hover:border-gray-500' : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 bg-white'
                }`}
              >
                <FolderOpen className="w-4 h-4" /> Manage Groups
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-lg ${
                  isDark ? 'bg-emerald-accent text-dark-bg shadow-emerald-accent/20' : 'bg-google-blue text-white shadow-google-blue/20'
                }`}
              >
                <Plus className="w-5 h-5" /> NEW SERVICE
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <MetricCard title="Active Agents" value={services.length.toString()} icon={Cpu} color={isDark ? "text-emerald-accent" : "text-google-blue"} theme={theme} />
            <MetricCard title="System Health" value="99.8%" icon={CheckCircle2} color="text-emerald-accent" theme={theme} />
            <MetricCard title="Self-Healing (24h)" value="1.2k" icon={ShieldCheck} color={isDark ? "text-emerald-accent" : "text-green-600"} theme={theme} />
            <MetricCard title="Manual Saves" value="84" icon={Zap} color={isDark ? "text-amber-400" : "text-amber-600"} theme={theme} />
          </div>

          {/* Recent Services */}
          {recentServices.length > 0 && (
            <div className="mb-10">
              <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-400': 'text-gray-500'}`}>
                Recently Added
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentServices.map((service, idx) => (
                  <div key={service.id} className={`p-4 rounded-xl border flex items-center gap-4 transition-all hover:shadow-md ${
                    isDark ? 'bg-dark-card border-dark-border hover:border-gray-600' : 'bg-white border-gray-200 hover:border-google-blue/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      service.status === 'Operational' ? 'bg-emerald-accent' : service.status === 'Degraded' ? 'bg-amber-400' : 'bg-rose-accent'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{service.microserviceName}</p>
                      <p className="text-xs text-gray-500">{service.gcpProject || 'No Project'} · {service.agentName}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      service.status === 'Operational' ? 'bg-emerald-accent/10 text-emerald-500' : 
                      service.status === 'Degraded' ? 'bg-amber-400/10 text-amber-500' : 'bg-rose-accent/10 text-rose-500'
                    }`}>{service.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters & View Toggle */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Microservices</h3>
              <div className="flex gap-2 flex-wrap">
                {['ALL', 'Operational', 'ISSUES'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setServiceFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                      serviceFilter === f 
                        ? (f === 'ISSUES' 
                          ? (isDark ? 'bg-rose-accent text-white border-rose-accent shadow-md shadow-rose-accent/20' : 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20')
                          : (isDark ? 'bg-emerald-accent text-dark-bg border-emerald-accent' : 'bg-google-blue text-white border-google-blue'))
                        : (isDark ? 'bg-gray-900 border-dark-border text-gray-500 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900')
                    }`}
                  >{f}</button>
                ))}
              </div>
              {uniqueProjects.length > 1 && (
                <div className="relative">
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className={`pl-3 pr-8 py-1.5 rounded-full text-[10px] font-bold border appearance-none cursor-pointer transition-all ${
                      projectFilter !== 'ALL'
                        ? (isDark ? 'bg-google-blue/20 border-google-blue text-google-blue' : 'bg-google-blue/10 border-google-blue text-google-blue')
                        : (isDark ? 'bg-gray-900 border-dark-border text-gray-500' : 'bg-white border-gray-200 text-gray-500')
                    }`}
                  >
                    <option value="ALL">All Projects</option>
                    {uniqueProjects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewMode('flat')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'flat' ? (isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900') : 'text-gray-400 hover:text-gray-600'}`}
                title="Flat View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grouped')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grouped' ? (isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900') : 'text-gray-400 hover:text-gray-600'}`}
                title="Grouped View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Empty State */}
          {!isLoading && filteredServices.length === 0 && (
            <div className={`text-center py-10 rounded-xl border border-dashed ${isDark ? 'border-gray-800 text-gray-600' : 'border-gray-300 text-gray-400'}`}>
              <Cpu className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold">No active microservices found.</p>
              <p className="text-xs mt-1">Click "NEW SERVICE" to register an agent.</p>
            </div>
          )}

          {/* Flat View */}
          {viewMode === 'flat' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 transition-all">
              {filteredServices.map((service, idx) => (
                <div key={service.id} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                  <ServiceCard {...service} theme={theme} onAction={(action) => handleAction(action, service)} />
                </div>
              ))}
            </div>
          )}

          {/* Grouped View */}
          {viewMode === 'grouped' && (
            <div className="space-y-8 mb-10">
              {groups.length > 0 ? (
                // Custom groups view
                Object.entries(customGroupedServices).map(([key, group]) => (
                  <div key={key} className={`rounded-2xl border-2 border-dashed p-6 transition-all ${
                    isDark ? 'border-gray-700 bg-gray-900/30' : 'bg-white/50'
                  }`} style={{ borderColor: group.color || '#dadce0' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 rounded-full" style={{ background: group.color || '#9ca3af' }}></div>
                      <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {group.name}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>{group.type || 'group'}</span>
                      <span className="text-xs text-gray-400">{group.services?.length || 0} services</span>
                    </div>
                    {group.services?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.services.map(service => (
                          <ServiceCard key={service.id} {...service} theme={theme} onAction={(action) => handleAction(action, service)} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No services in this group</p>
                    )}
                  </div>
                ))
              ) : (
                // Default: group by GCP project
                Object.entries(groupedByProject).map(([project, projectServices]) => (
                  <div key={project} className={`rounded-2xl border-2 border-dashed p-6 transition-all ${
                    isDark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-white/50'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-google-blue' : 'bg-google-blue'}`}></div>
                      <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {project}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>project</span>
                      <span className="text-xs text-gray-400">{projectServices.length} services</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projectServices.map(service => (
                        <ServiceCard key={service.id} {...service} theme={theme} onAction={(action) => handleAction(action, service)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Live Event Stream */}
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
        onSuccess={(msg) => {
          showToast(msg, 'success');
          fetchServices();
        }} 
      />

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

      <GroupManager
        isOpen={isGroupManagerOpen}
        onClose={() => setIsGroupManagerOpen(false)}
        theme={theme}
        services={services}
        groups={groups}
        onGroupsChange={() => fetchGroups()}
      />
    </div>
  );
}
