import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  FileText, 
  Brain, 
  Settings, 
  ShieldCheck,
  FolderOpen,
  LogOut,
  User
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, theme, currentUser, groups, onLogout, onManageGroups }) => {
  const isDark = theme === 'dark';
  
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Services', icon: Server },
    { name: 'System Logs', icon: FileText },
    { name: 'AI Training', icon: Brain }
  ];

  const initials = currentUser?.name 
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className={`w-64 border-r flex flex-col transition-all duration-300 shrink-0 ${
      isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
    }`}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
            isDark ? 'bg-emerald-accent/20' : 'bg-google-blue/10'
          }`}>
            <ShieldCheck className={`w-6 h-6 ${isDark ? 'text-emerald-accent' : 'text-google-blue'}`} />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Vantome</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Self-Healing Grid</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <button 
            key={item.name}
            onClick={() => setActiveTab(item.name)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${
              activeTab === item.name 
                ? (isDark ? 'bg-emerald-accent/10 text-emerald-accent border border-emerald-accent/20' : 'bg-google-blue text-white border-google-blue shadow-md shadow-google-blue/20')
                : (isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
            }`}
          >
            <item.icon className="w-5 h-5" /> {item.name}
          </button>
        ))}
        
        {/* Groups Section */}
        {groups && groups.length > 0 && (
          <>
            <div className="pt-6 mb-2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
              <span>Groups</span>
              <button 
                onClick={onManageGroups}
                className="text-gray-400 hover:text-google-blue transition-colors"
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>
            {groups.map(g => (
              <div 
                key={g.id}
                className={`flex items-center gap-3 p-2.5 px-3 rounded-lg text-sm transition-all cursor-default ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color || '#9ca3af' }}></div>
                <span className="truncate text-xs font-medium">{g.name}</span>
                <span className="text-[9px] text-gray-400 ml-auto">{g.serviceIds?.length || 0}</span>
              </div>
            ))}
          </>
        )}
        
        <div className="pt-8 mb-2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Settings</div>
        <button 
          onClick={() => setActiveTab('Configuration')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${
            activeTab === 'Configuration'
              ? (isDark ? 'bg-emerald-accent/10 text-emerald-accent border border-emerald-accent/20' : 'bg-google-blue text-white border-google-blue shadow-md shadow-google-blue/20')
              : (isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
          }`}
        >
          <Settings className="w-5 h-5" /> Configuration
        </button>
      </nav>

      <div className={`p-4 border-t ${isDark ? 'border-dark-border' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          isDark ? 'bg-gray-900 border-dark-border' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs transition-colors ${isDark ? 'bg-emerald-600' : 'bg-google-blue'}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentUser?.name || 'User'}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{currentUser?.email || ''}</p>
          </div>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
