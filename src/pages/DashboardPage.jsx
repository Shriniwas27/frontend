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
  FolderOpen,
  Grid3X3,
  List,
  ChevronDown
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import MetricCard from '../components/MetricCard';
import ServiceCard from '../components/ServiceCard';
import AgentDetailsModal from '../components/AgentDetailsModal';
import AddServiceModal from '../components/AddServiceModal';
import ConfigureServiceModal from '../components/ConfigureServiceModal';
import GroupManager from '../components/GroupManager';
import Toast from '../components/Toast';
import ChatbotWidget from '../components/ChatbotWidget';

import { getServices, deleteService, updateServiceStatus, getGroups } from '../api';

const getDisplayServiceName = (name) => {
  if (typeof name !== 'string') return name;
  return name.includes('/services/') ? name.split('/services/').pop() : name;
};

const isErrorLogType = (value) => {
  const normalized = String(value || '').toLowerCase();
  return normalized.includes('error') || normalized.includes('fatal') || normalized.includes('critical');
};

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
  const [isAgentDetailsOpen, setIsAgentDetailsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const [toast, setToast] = useState(null);
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // User info from localStorage
  const [currentUser, setCurrentUser] = useState(null);

  const [logs, setLogs] = useState([]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    showToast(`Switched to ${newTheme} theme`, 'info');
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    return () => root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    // Load user
    const storedUser = localStorage.getItem('cybermedic_user');
    if (storedUser) {
      try { setCurrentUser(JSON.parse(storedUser)); } catch { }
    }

    fetchServices();
    fetchGroups();
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const userId = JSON.parse(localStorage.getItem('cybermedic_user') || '{}')?.id;
      const res = await getServices(userId);
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
      setIsAgentDetailsOpen(true);
    } else if (action === 'Delete') {
      if (!window.confirm(`Are you sure you want to delete ${getDisplayServiceName(service.microserviceName)}?`)) return;
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
    <div className="flex h-dvh overflow-hidden bg-app-bg text-app-text-primary">

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {!isAgentDetailsOpen && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          groups={groups}
          onLogout={handleLogout}
          onManageGroups={() => setIsGroupManagerOpen(true)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">

        <TopHeader
          isDark={isDark}
          toggleTheme={toggleTheme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {isAgentDetailsOpen && selectedService ? (
          <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-6">
            <AgentDetailsModal
              isOpen={isAgentDetailsOpen}
              onClose={() => setIsAgentDetailsOpen(false)}
              onEditConfiguration={() => {
                setIsAgentDetailsOpen(false);
                setIsConfigOpen(true);
              }}
              service={selectedService}
              theme={theme}
            />
          </div>
        ) : (
        <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-7 lg:px-8">

          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="workspace-title text-3xl sm:text-4xl">{activeTab}</h1>
              <p className="mt-1 text-sm text-app-text-secondary">Monitor services and manage your self-healing agents.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsGroupManagerOpen(true)}
                className="brand-button brand-button-outline"
              >
                <FolderOpen className="size-4" aria-hidden="true" /> Manage groups
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="brand-button brand-button-primary"
              >
                <Plus className="size-5" aria-hidden="true" /> New agent
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="mb-8 grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 md:gap-4 xl:grid-cols-4">
            <MetricCard title="Active agents" value={services.length.toString()} icon={Cpu} tone="blue" />
            <MetricCard title="System health" value="99.8%" icon={CheckCircle2} tone="green" />
            <MetricCard title="Self-healing (24h)" value="1.2k" icon={ShieldCheck} tone="blue" />
            <MetricCard title="Manual saves" value="84" icon={Zap} tone="yellow" />
          </div>

          {/* Recent Services */}
          {recentServices.length > 0 && (
            <div className="mb-10">
              <h2 className="workspace-section-title mb-4">Recently added</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentServices.map((service) => (
                  <div key={service.id} className="ui-card-soft flex items-center gap-3 rounded-2xl p-4">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{getDisplayServiceName(service.microserviceName)}</p>
                      <p className="text-xs text-gray-500">{service.gcpProject || 'No Project'} · {service.agentName}</p>
                    </div>
                    <span className="preview-badge" data-tone={service.status === 'Operational' ? 'green' : service.status === 'Degraded' ? 'yellow' : 'red'}>{service.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters & View Toggle */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="workspace-section-title mr-1">Active microservices</h2>
              <div className="flex gap-2 flex-wrap">
                {[['ALL', 'All'], ['Operational', 'Operational'], ['ISSUES', 'Issues']].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setServiceFilter(value)}
                    aria-pressed={serviceFilter === value}
                    className="workspace-filter px-3"
                  >{label}</button>
                ))}
              </div>
              {uniqueProjects.length > 1 && (
                <div className="relative">
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    aria-label="Filter by project"
                    data-selected={projectFilter !== 'ALL'}
                    className="workspace-filter max-w-full cursor-pointer appearance-none pl-3 pr-8"
                  >
                    <option value="ALL">All projects</option>
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
                className="workspace-icon-button"
                aria-pressed={viewMode === 'flat'}
                title="Flat view"
                aria-label="Flat view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className="workspace-icon-button"
                aria-pressed={viewMode === 'grouped'}
                title="Grouped view"
                aria-label="Grouped view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Empty State */}
          {!isLoading && filteredServices.length === 0 && (
            <div className="ui-card-soft rounded-2xl p-8 text-center">
              <span className="landing-feature-icon mx-auto" data-tone="blue"><Cpu aria-hidden="true" /></span>
              <p className="font-medium">No matching microservices</p>
              <p className="mt-1 text-sm text-app-text-secondary">
                {services.length ? 'Try another search or change your filters.' : 'Register an agent to start monitoring a service.'}
              </p>
            </div>
          )}

          {/* Flat View */}
          {viewMode === 'flat' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 transition-all">
              {filteredServices.map((service, idx) => (
                <div key={service.id} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                  <ServiceCard {...service} onAction={(action) => handleAction(action, service)} />
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
                  <div key={key} className={`rounded-2xl border-2 border-dashed p-6 transition-all ${isDark ? 'border-gray-700 bg-gray-900/30' : 'ui-card-soft'
                    }`} style={{ borderColor: group.color || '#dadce0' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 rounded-full" style={{ background: group.color || '#9ca3af' }}></div>
                      <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {group.name}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                        }`}>{group.type || 'group'}</span>
                      <span className="text-xs text-gray-400">{group.services?.length || 0} services</span>
                    </div>
                    {group.services?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.services.map(service => (
                          <ServiceCard key={service.id} {...service} onAction={(action) => handleAction(action, service)} />
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
                  <div key={project} className={`rounded-2xl border-2 border-dashed p-6 transition-all ${isDark ? 'border-gray-700 bg-gray-900/30' : 'ui-card-soft'
                    }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-google-blue' : 'bg-google-blue'}`}></div>
                      <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {project}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                        }`}>project</span>
                      <span className="text-xs text-gray-400">{projectServices.length} services</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projectServices.map(service => (
                        <ServiceCard key={service.id} {...service} onAction={(action) => handleAction(action, service)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Live Event Stream */}
          <div className="ui-card-soft rounded-2xl p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Terminal className="size-5 text-google-blue" aria-hidden="true" />
                <h2 className="workspace-section-title">Live event stream</h2>
              </div>
              <button
                onClick={() => showToast('Log export started', 'success')}
                className="workspace-filter inline-flex items-center gap-2 px-3"
              >
                <Share2 className="size-3" aria-hidden="true" /> Export
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {logs.length > 0 ? (
                logs.map((log) => {
                  const logType = log.type || log.severity || log.level || 'INFO';
                  const hasError = isErrorLogType(logType);

                  return (
                  <div key={log.id} className={`flex gap-4 p-2 rounded-lg transition-colors ${hasError
                      ? (isDark ? 'bg-rose-900/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200')
                      : (isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50')}`}>
                    <span className="text-gray-500">[{log.time}]</span>
                    <span className={isDark ? 'text-emerald-accent' : 'text-google-blue'}>[{log.agent}]</span>
                    <span className={hasError ? (isDark ? 'text-rose-300' : 'text-rose-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}>
                      [{String(logType).toUpperCase()}] {log.action}
                    </span>
                  </div>
                  );
                })
              ) : (
                <div className={`p-3 rounded-lg border text-xs ${isDark ? 'bg-gray-900/40 border-dark-border text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  No live logs yet.
                </div>
              )}
            </div>
          </div>
        </div>
        )}
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

      <ChatbotWidget
        scope={isAgentDetailsOpen && selectedService ? 'agent-details' : 'dashboard'}
        agentId={isAgentDetailsOpen && selectedService ? (selectedService.agentId || selectedService.id) : null}
      />
    </div>
  );
}
