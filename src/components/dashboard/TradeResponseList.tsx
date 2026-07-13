interface Trade {
  name: string;
  value: number;
  count: number;
}

interface Props {
  data: Trade[];
}

export function TradeResponseList({ data }: Props) {
  if (data.length === 0) {
    return <div className="text-sm text-[var(--dash-text-3)] text-center py-8">No open items — all caught up</div>;
  }
  const max = Math.max(...data.map((t) => t.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((t, i) => {
        const widthPct = Math.max(8, (t.value / max) * 100);
        return (
          <li
            key={t.name}
            className="flex items-center gap-4 p-2 -mx-2 rounded-xl transition-colors hover:bg-[var(--accent-tint)] group"
          >
            <span className="w-7 h-7 rounded-lg bg-[var(--dash-card-2)] border border-[var(--dash-border)] flex items-center justify-center text-[13px] font-bold text-[var(--dash-cyan)] group-hover:border-[var(--dash-cyan)]/50 transition-colors shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="text-sm font-bold text-[var(--dash-text)] truncate">{t.name}</div>
                <div className="text-xs text-[var(--dash-text-2)] tabular-nums shrink-0 font-semibold">
                  {t.value} open · {t.count} home{t.count === 1 ? '' : 's'}
                </div>
              </div>
              <div className="w-full h-2 bg-[var(--dash-card-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--dash-cyan-dim)] to-[var(--dash-cyan)] rounded-full transition-all duration-500 group-hover:shadow-[0_0_12px_rgba(159,231,229,0.4)]"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
