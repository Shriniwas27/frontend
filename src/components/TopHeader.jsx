import { Moon, Search, Sun } from 'lucide-react';

export default function TopHeader({ toggleTheme, isDark, searchQuery, onSearchChange }) {
  const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-app-border bg-app-card px-3 sm:px-6">
      <div className="workspace-search flex w-full max-w-lg items-center gap-3 rounded-full px-4">
        <Search className="size-5 shrink-0 text-app-text-secondary" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search services, agents, and projects"
          placeholder="Search services, agents, projects"
          value={searchQuery || ''}
          onChange={(event) => onSearchChange?.(event.target.value)}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm placeholder:text-app-text-secondary"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="preview-badge hidden items-center gap-2 lg:inline-flex" data-tone="green">
          <span className="size-2 rounded-full bg-current" aria-hidden="true" />
          Grid healthy
        </div>
        <button onClick={toggleTheme} className="workspace-icon-button" title={themeLabel} aria-label={themeLabel}>
          {isDark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
