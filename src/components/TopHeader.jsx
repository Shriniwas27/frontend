import React from 'react';
import { Search, Sun, Moon } from 'lucide-react';

const TopHeader = ({ theme, toggleTheme, isDark, searchQuery, onSearchChange }) => (
  <header className={`h-16 border-b flex items-center justify-between px-8 shrink-0 transition-colors ${
    isDark ? 'bg-dark-card/50 border-dark-border backdrop-blur-md' : 'bg-white/95 border-gray-200 shadow-[0_2px_10px_rgba(107,114,128,0.12)]'
  }`}>
    <div className={`flex items-center gap-4 border px-4 py-1.5 rounded-full w-96 group transition-all ${
      isDark ? 'bg-gray-900 border-dark-border focus-within:border-emerald-accent/50' : 'bg-white border-gray-200 shadow-[0_2px_8px_rgba(107,114,128,0.11)] focus-within:border-google-blue/50'
    }`}>
      <Search className="w-4 h-4 text-gray-500" />
      <input 
        type="text" 
        placeholder="Search services, agents, projects..." 
        value={searchQuery || ''}
        onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        className={`bg-transparent border-none text-xs focus:outline-none w-full ${isDark ? 'text-white' : 'text-gray-900'}`} 
      />
    </div>

    <div className="flex items-center gap-5">
      <button 
        onClick={toggleTheme}
        className={`p-2 rounded-lg border transition-all ${
          isDark ? 'bg-gray-800 border-dark-border text-amber-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-google-blue hover:bg-gray-50 shadow-sm'
        }`}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      
      <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
        <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-emerald-accent' : 'bg-green-500'}`}></span>
        Grid Healthy
      </div>
    </div>
  </header>
);

export default TopHeader;
