import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sparkles } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useWeather } from '../../hooks/useWeather';
import { db } from '../../db';

const DEFAULT_LAT = 30.6327;
const DEFAULT_LON = -97.6779;
const DEFAULT_COMMUNITY_NAME = 'The Condenser';
const AUTO_DISMISS_MS = 2000;
const FADE_MS = 300;

interface Props {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: Props) {
  const profile = useProfile();
  const communities = useLiveQuery(() => db.communities.toArray()) ?? [];
  const defaultCommunity =
    communities.find((c) => c.id === profile.weatherCommunityId) ??
    communities.find((c) => c.isDefault) ??
    communities[0];

  const lat = defaultCommunity?.lat ?? DEFAULT_LAT;
  const lon = defaultCommunity?.lon ?? DEFAULT_LON;
  const communityName = defaultCommunity?.name ?? DEFAULT_COMMUNITY_NAME;
  const { snap } = useWeather(lat, lon);

  const [fading, setFading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleDismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    if (fading) return;
    setFading(true);
    setTimeout(onDismiss, FADE_MS);
  };

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const greeting = profile.greetingEnabled
    ? `${profile.greetingWord}, ${profile.firstName || 'there'}`
    : `Welcome back${profile.firstName ? `, ${profile.firstName}` : ''}`;

  return (
    <div
      onClick={handleDismiss}
      role="button"
      aria-label="Tap to continue"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 cursor-pointer transition-opacity duration-300 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'var(--bg)' }}
    >
      {/* Grid + glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.25,
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 40% at 50% 40%, var(--accent-tint), transparent 65%)',
        }}
      />

      <div className="relative flex flex-col items-center text-center max-w-md">
        <div className="app-chip mb-7">
          <Sparkles size={10} strokeWidth={2.5} />
          The Condenser
        </div>

        <h1 className="font-display text-[48px] sm:text-[60px] font-extrabold uppercase tracking-tight text-[var(--text)] leading-[0.95] mb-8">
          {greeting}
        </h1>

        <div className="flex flex-col items-center gap-1 mb-10">
          <div className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-[0.15em]">
            {dateStr}
          </div>
          <div className="font-mono text-2xl text-[var(--text)] tabular-nums mt-1">{timeStr}</div>
        </div>

        {snap ? (
          <div className="app-card px-6 py-4 flex items-center gap-4">
            <span className="text-4xl" aria-hidden>
              {snap.icon}
            </span>
            <div className="text-left">
              <div className="font-mono text-3xl font-extrabold text-[var(--text)] tabular-nums leading-none">
                {snap.tempF}°
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider mt-1">
                {snap.condition} · {communityName}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--text-3)]">Loading weather…</div>
        )}

        <div className="mt-12 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-3)]">
          Tap to continue
        </div>
      </div>
    </div>
  );
}
