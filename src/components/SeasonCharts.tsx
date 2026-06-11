import { useState, useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

const COLORS = [
  '#6c63ff','#4caf73','#f0b429','#e05c5c','#5cade0','#e07c5c',
  '#a855f7','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4',
];

const W = 680, H = 280;
const ML = 44, MR = 16, MT = 16, MB = 36;
const CW = W - ML - MR, CH = H - MT - MB;

export default function SeasonCharts({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  const weeks = useMemo(
    () => seasonMatchups ? Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b) : [],
    [seasonMatchups]
  );

  const seriesData = useMemo(() => {
    return rosters.map((roster, i) => {
      const pts = weeks.map(w => {
        const m = (seasonMatchups?.[w] ?? []).find(x => x.roster_id === roster.roster_id);
        return m?.points ?? 0;
      });
      const user = userMap.get(roster.owner_id);
      return {
        rosterId: roster.roster_id,
        label: user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`,
        avatar: user ? avatarUrl(user.avatar) : null,
        color: COLORS[i % COLORS.length],
        pts,
      };
    });
  }, [rosters, userMap, seasonMatchups, weeks]);

  if (isLoading) return <div className="loading">Loading season data…</div>;
  if (!weeks.length) return <div className="empty">No season data available yet.</div>;

  const allPts = seriesData.flatMap(s => s.pts).filter(p => p > 0);
  const minPts = Math.max(0, Math.min(...allPts) - 20);
  const maxPts = Math.max(...allPts) + 20;
  const ptRange = maxPts - minPts || 1;

  const xStep = weeks.length > 1 ? CW / (weeks.length - 1) : CW;
  const toX = (i: number) => ML + i * xStep;
  const toY = (pts: number) => MT + CH - ((pts - minPts) / ptRange) * CH;

  const yTicks = Array.from({ length: 5 }, (_, i) => minPts + (ptRange / 4) * i);

  const toggle = (id: number) =>
    setHidden(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        {/* Y grid + labels */}
        {yTicks.map(tick => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={ML - 4} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-dim)">
                {tick.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {weeks.map((w, i) => (
          <text key={w} x={toX(i)} y={H - MB + 14} textAnchor="middle" fontSize="10" fill="var(--text-dim)">
            {w}
          </text>
        ))}
        <text x={ML + CW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="var(--text-dim)">Week</text>

        {/* Lines */}
        {seriesData.map(series => {
          if (hidden.has(series.rosterId)) return null;
          const points = series.pts
            .map((p, i) => p > 0 ? `${toX(i)},${toY(p)}` : null)
            .filter(Boolean)
            .join(' ');
          if (!points) return null;
          return (
            <polyline
              key={series.rosterId}
              points={points}
              fill="none"
              stroke={series.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}

        {/* Dots */}
        {seriesData.map(series => {
          if (hidden.has(series.rosterId)) return null;
          return series.pts.map((p, i) =>
            p > 0 ? (
              <circle key={i} cx={toX(i)} cy={toY(p)} r="3" fill={series.color}>
                <title>{series.label} Wk{weeks[i]}: {p.toFixed(2)}</title>
              </circle>
            ) : null
          );
        })}
      </svg>

      {/* Legend */}
      <div className="chart-legend">
        {seriesData.map(series => (
          <button
            key={series.rosterId}
            className={`legend-btn ${hidden.has(series.rosterId) ? 'legend-hidden' : ''}`}
            onClick={() => toggle(series.rosterId)}
          >
            <span className="legend-dot" style={{ background: series.color }} />
            {series.avatar && <img src={series.avatar} alt="" className="avatar-xs" />}
            <span>{series.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
