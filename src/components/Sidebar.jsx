import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  FileText, 
  Brain, 
  Settings, 
  ShieldCheck 
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, theme }) => {
  const isDark = theme === 'dark';
  
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Services', icon: Server },
    { name: 'System Logs', icon: FileText },
    { name: 'AI Training', icon: Brain }
  ];

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
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>CyberMedic <span className={isDark ? 'text-emerald-accent' : 'text-google-blue'}>AI</span></h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Self-Healing Grid</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 py-4">
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

      <div className="p-4 border-t border-dark-border">
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          isDark ? 'bg-gray-900 border-dark-border' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-colors ${isDark ? 'bg-emerald-600' : 'bg-google-blue'}`}>JD</div>
          <div>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Josh Doe</p>
            <p className="text-[10px] text-gray-500 uppercase font-black">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
