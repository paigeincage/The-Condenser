import { Moon, Sun, Check } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { useProfile, saveProfile } from '../../hooks/useProfile';
import { useTheme } from '../../hooks/useTheme';
import { Section } from '../../components/settings/SettingsField';
import { ACCENTS, DEFAULT_ACCENT } from '../../config/accents';

const SCALE_OPTIONS = [
  { value: 0.9, label: 'Small' },
  { value: 1.0, label: 'Default' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Larger' },
  { value: 1.5, label: 'Largest' },
];

export function AccessibilitySettings() {
  const profile = useProfile();
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <TopBar title="Accessibility" back />

      <Section title="Theme" description="Light and dark work everywhere in the app.">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border-2 flex items-center justify-center gap-2 ${
              theme === 'light'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--card-2)] text-[var(--text)] border-[var(--border)] hover:border-[var(--accent-glow)]'
            }`}
          >
            <Sun size={16} strokeWidth={2.5} />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border-2 flex items-center justify-center gap-2 ${
              theme === 'dark'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--card-2)] text-[var(--text)] border-[var(--border)] hover:border-[var(--accent-glow)]'
            }`}
          >
            <Moon size={16} strokeWidth={2.5} />
            Dark
          </button>
        </div>
      </Section>

      <Section title="Action color" description="Recolors buttons and highlights across the app. Maroon is the default.">
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = (profile.accentColor || DEFAULT_ACCENT) === a.id;
            return (
              <button
                key={a.id}
                onClick={() => saveProfile({ accentColor: a.id })}
                aria-label={a.label}
                title={a.label}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-0.5 ${
                    active ? 'ring-2 ring-offset-2 ring-offset-[var(--card)] ring-[var(--text)]' : ''
                  }`}
                  style={{ background: a.base, boxShadow: active ? undefined : '0 2px 8px -2px rgba(0,0,0,0.3)' }}
                >
                  {active && <Check size={20} strokeWidth={3} className="text-white" />}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-[var(--text)]' : 'text-[var(--text-3)]'}`}>
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Text size" description="Scales text across the entire app.">
        <div className="grid grid-cols-5 gap-2">
          {SCALE_OPTIONS.map((o) => {
            const active = Math.abs(profile.fontScale - o.value) < 0.01;
            return (
              <button
                key={o.value}
                onClick={() => saveProfile({ fontScale: o.value })}
                className={`py-2 rounded-lg font-semibold text-xs transition-colors border-2 ${
                  active
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--card-2)] border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-glow)]'
                }`}
                style={{ fontSize: `${12 * o.value}px` }}
              >
                Aa
                <div className="text-[10px] mt-0.5 font-normal">{o.label}</div>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
