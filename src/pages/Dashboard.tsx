import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/dashboard';
import { useProfile } from '../hooks/useProfile';
import { HeroMetric } from '../components/dashboard/HeroMetric';
import { StageBarChart } from '../components/dashboard/StageBarChart';
import { VelocityLineChart } from '../components/dashboard/VelocityLineChart';
import { PunchActivityChart } from '../components/dashboard/PunchActivityChart';
import { TradeResponseList } from '../components/dashboard/TradeResponseList';
import { ActionFeed } from '../components/dashboard/ActionFeed';
import type { DashboardSummary } from '../types';

// Icon set — simple inline SVGs
const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconZap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-4 4 4 5-8" />
  </svg>
);
const IconActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);
const IconFlag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);
const IconPulse = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l3-9 4 18 3-9h4" />
  </svg>
);

export function Dashboard() {
  const profile = useProfile();
  const nav = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const monthShort = new Date().toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="dash-root -mx-5 -mt-0 px-5 lg:-mx-8 lg:px-8 pt-8 pb-16 min-h-dvh">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8 lg:mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="dash-chip">Live · {new Date().toLocaleDateString('en-US', { weekday: 'short' })}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--dash-text)]">
            {profile.firstName ? `${profile.firstName}'s` : ''} Dashboard
          </h1>
          <p className="text-sm text-[var(--dash-text-2)] mt-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right hidden lg:block">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--dash-text-3)]">Last updated</div>
          <div className="text-sm text-[var(--dash-text-2)] mt-1">Just now</div>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-24 text-sm text-[var(--dash-text-3)]">Loading your dashboard…</div>
      ) : error || !data ? (
        <div className="dash-card text-center py-16">
          <div className="text-base font-bold text-[var(--dash-text)] mb-1.5">Couldn't load the dashboard</div>
          <div className="text-xs text-[var(--dash-text-2)]">Check your connection and try again.</div>
        </div>
      ) : !data.hasProjects ? (
        <div className="dash-card text-center py-16">
          <div className="text-lg font-extrabold text-[var(--dash-text)] mb-1.5">No homes yet</div>
          <div className="text-sm text-[var(--dash-text-2)] mb-5">
            Your dashboard fills in as you add homes and punch lists. Add your first home to get started.
          </div>
          <button onClick={() => nav('/new')} className="app-btn-primary mx-auto">Add a home</button>
        </div>
      ) : (
        <>
          {/* TOP ROW — Hero Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-6 lg:mb-8">
            <HeroMetric label="Active Homes" value={data.heroes.activeHomes} sublabel="Under management" icon={<IconHome />} />
            <HeroMetric label={`Completed · ${monthShort}`} value={data.heroes.completedThisMonth} sublabel="This month" icon={<IconCheck />} />
            <HeroMetric label="Completed · Quarter" value={data.heroes.completedThisQuarter} sublabel="Current quarter" icon={<IconCalendar />} />
            <HeroMetric label="Avg Build Days" value={data.heroes.avgBuildDays ?? '—'} sublabel="Start → complete" icon={<IconZap />} />
          </div>

          {/* Desktop-only: middle + bottom rows */}
          <div className="hidden lg:block">
            {/* MIDDLE ROW */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <ChartCard title="Homes by Stage" subtitle="Where every home stands right now" icon={<IconChart />}>
                {data.stageData.length ? (
                  <StageBarChart data={data.stageData} />
                ) : (
                  <EmptyChart label="Set a build stage on your homes to see this" />
                )}
              </ChartCard>

              <ChartCard title="Build Velocity" subtitle="Average days from start to complete · trending down is good" icon={<IconActivity />} badge="6 months">
                {data.velocity.length ? (
                  <VelocityLineChart data={data.velocity} />
                ) : (
                  <EmptyChart label="Completes with start + finish dates will chart here" />
                )}
              </ChartCard>

              <ChartCard title="Punch Items / Week" subtitle="How active is your list engine" icon={<IconPulse />} badge="Last 8 weeks">
                <PunchActivityChart data={data.punchActivity} />
              </ChartCard>

              <ChartCard title="Busiest Trades" subtitle="Open items by trade across all homes · longer bar = more work" icon={<IconClock />}>
                <TradeResponseList data={data.tradeLoad} />
              </ChartCard>
            </div>

            {/* BOTTOM ROW */}
            <div className="grid grid-cols-3 gap-5">
              <ActionFeed title="Needs Attention" icon={<IconAlert />} items={data.needsAttention} emptyLabel="Nothing overdue — nice work" />
              <ActionFeed title="Upcoming Closes" icon={<IconFlag />} items={data.upcoming} emptyLabel="No closes scheduled" />
              <ActionFeed title="Recent Activity" icon={<IconPulse />} items={data.recentActivity} emptyLabel="No recent activity" />
            </div>
          </div>

          {/* Mobile-only: Needs Attention + notice */}
          <div className="lg:hidden mt-6 space-y-4">
            <ActionFeed title="Needs Attention" icon={<IconAlert />} items={data.needsAttention} emptyLabel="Nothing overdue — nice work" />
            <div className="dash-card text-center">
              <div className="text-base font-bold text-[var(--dash-text)] mb-1.5">Full dashboard on desktop</div>
              <div className="text-xs text-[var(--dash-text-2)]">
                Charts and activity feeds open up at 1024px+. Open this on your laptop for the full view.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[260px] flex items-center justify-center text-center px-6">
      <p className="text-sm text-[var(--dash-text-3)]">{label}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dash-card">
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-[var(--dash-card-2)] border border-[var(--dash-border)] flex items-center justify-center text-[var(--dash-cyan)] shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-xl font-extrabold text-[var(--dash-text)] tracking-tight truncate">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--dash-text-2)] mt-1 leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        {badge && <span className="dash-chip shrink-0">{badge}</span>}
      </div>
      {children}
    </div>
  );
}
