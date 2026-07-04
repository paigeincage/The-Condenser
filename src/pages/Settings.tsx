import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import {
  User,
  Home,
  MessageSquare,
  Bell,
  Languages,
  Users,
  Eye,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { ThemeToggle } from '../components/layout/ThemeToggle';

interface TabLink {
  to: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const TABS: TabLink[] = [
  { to: '/settings/profile', title: 'Profile', description: 'Your name, company, greeting, and photo', Icon: User },
  { to: '/settings/communities', title: 'Communities & Homes', description: 'Neighborhoods, lots, and build stages', Icon: Home },
  { to: '/settings/templates', title: 'Message Templates', description: 'Default email and text wording', Icon: MessageSquare },
  { to: '/settings/notifications', title: 'Notifications', description: 'Confirmations, summaries, quiet hours', Icon: Bell },
  { to: '/settings/field-language', title: 'Field Language', description: 'Optional — terms that auto-route to trades', Icon: Languages },
  { to: '/settings/contacts', title: 'Contacts', description: 'Trade partners and send preferences', Icon: Users },
  { to: '/settings/accessibility', title: 'Accessibility', description: 'Theme, font, size, and contrast', Icon: Eye },
];

export function Settings() {
  const nav = useNavigate();
  const clearAuth = useAuth((s) => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
    nav('/login', { replace: true });
  };
  return (
    <div>
      <TopBar title="Settings" back right={<ThemeToggle />} />
      <div className="flex flex-col gap-3">
        {TABS.map(({ to, title, description, Icon }, idx) => (
          <button
            key={to}
            onClick={() => nav(to)}
            className="app-card app-card--interactive text-left group animate-fade-up"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[var(--card-2)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent-glow)] transition-colors shrink-0">
                <Icon size={20} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-base uppercase tracking-tight text-[var(--text)]">
                  {title}
                </div>
                <div className="text-xs text-[var(--text-3)] mt-0.5">{description}</div>
              </div>
              <ChevronRight
                size={18}
                strokeWidth={2}
                className="text-[var(--text-3)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </div>
          </button>
        ))}

        <button
          onClick={handleLogout}
          className="app-card app-card--interactive text-left group animate-fade-up mt-2"
          style={{ animationDelay: `${TABS.length * 0.05}s` }}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--card-2)] border-2 border-[var(--border)] flex items-center justify-center text-red-500 shrink-0">
              <LogOut size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-base uppercase tracking-tight text-red-500">
                Log Out
              </div>
              <div className="text-xs text-[var(--text-3)] mt-0.5">Sign out of this device</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
