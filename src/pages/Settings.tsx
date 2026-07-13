import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { useProfile } from '../hooks/useProfile';
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

interface Row {
  to: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

interface Group {
  label: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    label: 'You',
    rows: [
      { to: '/settings/profile', title: 'Profile', description: 'Name, company, greeting, and photo', Icon: User },
      { to: '/settings/accessibility', title: 'Accessibility', description: 'Theme, font, size, and contrast', Icon: Eye },
    ],
  },
  {
    label: 'Your Business',
    rows: [
      { to: '/settings/contacts', title: 'Contacts', description: 'Trade partners and send preferences', Icon: Users },
      { to: '/settings/communities', title: 'Communities & Homes', description: 'Neighborhoods, lots, and build stages', Icon: Home },
      { to: '/settings/templates', title: 'Message Templates', description: 'Default email and text wording', Icon: MessageSquare },
      { to: '/settings/field-language', title: 'Field Language', description: 'Terms that auto-route to trades', Icon: Languages },
    ],
  },
  {
    label: 'App',
    rows: [
      { to: '/settings/notifications', title: 'Notifications', description: 'Confirmations, summaries, quiet hours', Icon: Bell },
    ],
  },
];

export function Settings() {
  const nav = useNavigate();
  const clearAuth = useAuth((s) => s.clearAuth);
  const profile = useProfile();

  const handleLogout = () => {
    clearAuth();
    nav('/login', { replace: true });
  };

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your Profile';
  const initials =
    [profile.firstName, profile.lastName]
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'C';

  return (
    <div className="pb-8">
      <TopBar title="Settings" right={<ThemeToggle />} />

      {/* Profile summary */}
      <button
        onClick={() => nav('/settings/profile')}
        className="app-card app-card--interactive w-full text-left group animate-fade-up mb-6"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold font-display shrink-0"
            style={{ background: 'var(--accent-tint)', color: 'var(--accent)', border: '2px solid var(--accent-tint-2)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-extrabold text-lg uppercase tracking-tight text-[var(--text)] truncate">
              {fullName}
            </div>
            <div className="text-xs text-[var(--text-3)] truncate">
              {profile.companyName}
              {profile.email ? ` · ${profile.email}` : ''}
            </div>
          </div>
          <ChevronRight
            size={18}
            strokeWidth={2}
            className="text-[var(--text-3)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0"
          />
        </div>
      </button>

      {/* Grouped settings */}
      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
        {GROUPS.map((group, gi) => (
          <section key={group.label} className="animate-fade-up" style={{ animationDelay: `${(gi + 1) * 0.06}s` }}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-2 px-1">
              {group.label}
            </h2>
            <div className="app-card !p-0 overflow-hidden divide-y divide-[var(--border)]">
              {group.rows.map(({ to, title, description, Icon }) => (
                <button
                  key={to}
                  onClick={() => nav(to)}
                  className="w-full text-left group flex items-center gap-3.5 px-4 py-3.5 hover:bg-[var(--card-2)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--card-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent-glow)] transition-colors shrink-0">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[var(--text)]">{title}</div>
                    <div className="text-xs text-[var(--text-3)] truncate">{description}</div>
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={2}
                    className="text-[var(--text-4)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Log out */}
      <button
        onClick={handleLogout}
        className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[var(--border)] text-[var(--red)] font-bold text-sm hover:border-[var(--red)]/40 hover:bg-[var(--red)]/5 transition-colors"
      >
        <LogOut size={16} strokeWidth={2.5} />
        Log Out
      </button>
    </div>
  );
}
