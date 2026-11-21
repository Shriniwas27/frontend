import { Brain, FileText, LayoutDashboard, LogOut, Server, Settings } from 'lucide-react';
import Brand from './Brand';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Services', icon: Server },
  { name: 'System Logs', icon: FileText },
  { name: 'AI Training', icon: Brain },
  { name: 'Configuration', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, currentUser, groups, onLogout, onManageGroups }) {
  const initials = currentUser?.name
    ? currentUser.name.trim().split(/\s+/).map((name) => name[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="workspace-sidebar flex w-60 shrink-0 flex-col border-r">
      <div className="flex h-16 shrink-0 items-center justify-center md:justify-start md:px-5" aria-label="Vantome">
        <Brand />
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-2 py-4 md:px-3" aria-label="Workspace">
        {navItems.map(({ name, icon: Icon }) => (
          <button
            key={name}
            onClick={() => setActiveTab(name)}
            aria-current={activeTab === name ? 'page' : undefined}
            aria-label={name}
            title={name}
            className="workspace-nav-link"
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span>{name}</span>
          </button>
        ))}

        {groups?.length > 0 && (
          <div className="hidden pt-5 md:block">
            <div className="flex items-center justify-between px-3 text-sm font-medium text-app-text-secondary">
              <span>Groups</span>
              <button onClick={onManageGroups} className="workspace-icon-button" aria-label="Manage groups">
                <Settings className="size-4" aria-hidden="true" />
              </button>
            </div>
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-3 px-3 py-2 text-sm text-app-text-secondary">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: group.color || 'var(--text-secondary)' }} />
                <span className="flex-1 truncate">{group.name}</span>
                <span>{group.serviceIds?.length || 0}</span>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-2 border-t border-app-border px-2 py-4 md:flex-row md:px-3">
        <span className="preview-badge grid size-8 place-items-center !p-0" data-tone="blue" title={currentUser?.name || 'User'}>{initials}</span>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm font-medium">{currentUser?.name || 'User'}</p>
          <p className="truncate text-xs text-app-text-secondary">{currentUser?.email || ''}</p>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="workspace-icon-button" title="Sign out" aria-label="Sign out">
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
}
