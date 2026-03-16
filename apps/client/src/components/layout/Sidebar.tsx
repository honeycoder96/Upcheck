import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarItem {
  label: string;
  icon: ReactNode;
  href: string;
}

interface SidebarProps {
  items: SidebarItem[];
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ items, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    collapsed && 'justify-center'
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-md px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
