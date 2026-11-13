import { Outlet, NavLink } from 'react-router-dom';
import { House, type LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [{ to: '/', label: '首页', icon: House, end: true }];

export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center gap-8 border-b border-border bg-surface px-5">
        <span className="text-base font-semibold">{import.meta.env.VITE_APP_TITLE || '应用'}</span>
        <nav className="flex gap-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 no-underline transition-colors',
                  isActive ? 'bg-primary-soft text-primary' : 'text-content-weak hover:text-content',
                ].join(' ')
              }
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-5">
        <Outlet />
      </main>
    </div>
  );
}
