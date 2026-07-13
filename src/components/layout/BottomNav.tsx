import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Settings } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

export function BottomNav() {
  const { pathname } = useLocation();
  if (pathname === '/login' || pathname === '/signup') return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="max-w-[680px] lg:max-w-[880px] mx-auto flex justify-around">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
              }`
            }
          >
            <Icon size={22} strokeWidth={2} className="mb-1" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
