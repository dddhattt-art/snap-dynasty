import { useState, useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

const COLORS = ['#6c63ff','#4caf73','#f0b429','#e05c5c','#5cade0','#e07c5c','#a855f7','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4'];

const W = 680, H = 260;
const ML = 44, MR = 16, MT = 16, MB = 36;
const CW = W - ML - MR, CH = H - MT - MB;

export default function ScoringTrends({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const weeks = useMemo(
    () => seasonMatchups ? Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b) : [],
    [seasonMatchups]
  );

  if (isLoading) return <div className="loading">Loading scoring trends…</div>;
  if (!weeks.length) return <div className="empty">No season data yet.</div>;

  const activeRosters = selectedId !== null ? rosters.filter(r => r.roster_id === selectedId) : rosters;
  const activeId = selectedId ?? activeRosters[0]?.roster_id;
  const displayRoster = rosters.find(r => r.roster_id === activeId) ?? rosters[0];
  const color = COLORS[rosters.indexOf(displayRoster) % COLORS.length];

  const scores = weeks.map(w => seasonMatchups![w].find(m => m.roster_id === displayRoster.roster_id)?.points ?? 0);
  const rolling = weeks.map((_, i) => {
    const slice = scores.slice(Math.max(0, i - 2), i + 1).filter(p => p > 0);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
  });

  const validPts = scores.filter(p => p > 0);
  const minPts = Math.min(...validPts) - 10;
  const maxPts = Math.max(...validPts) + 10;
  const ptRange = maxPts - minPts || 1;

  const toX = (i: number) => ML + (weeks.length > 1 ? (i / (weeks.length - 1)) * CW : CW / 2);
  const toY = (v: number) => MT + CH - ((v - minPts) / ptRange) * CH;

  const yTicks = Array.from({ length: 5 }, (_, i) => minPts + (ptRange / 4) * i);
  return (
    <div>
      <div className="roster-selector" style={{ marginBottom: '1rem' }}>
        {rosters.map((r, i) => {
          const u = userMap.get(r.owner_id);
          const av = u ? avatarUrl(u.avatar) : null;
          return (
            <button
              key={r.roster_id}
              className={`roster-team-btn ${r.roster_id === (selectedId ?? activeRosters[0]?.roster_id) ? 'active' : ''}`}
              onClick={() => setSelectedId(r.roster_id)}
              style={r.roster_id === (selectedId ?? activeRosters[0]?.roster_id) ? { borderColor: COLORS[i % COLORS.length] } : {}}
            >
              {av && <img src={av} alt="" className="avatar-xs" />}
              <span>{u?.display_name ?? u?.username ?? `T${r.roster_id}`}</span>
            </button>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={ML} y1={toY(tick)} x2={W - MR} y2={toY(tick)} stroke="var(--border)" strokeWidth="1" />
            <text x={ML - 4} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="var(--text-dim)">{tick.toFixed(0)}</text>
          </g>
        ))}
        {weeks.map((w, i) => (
          <text key={w} x={toX(i)} y={H - MB + 14} textAnchor="middle" fontSize="10" fill="var(--text-dim)">{w}</text>
        ))}
        <text x={ML + CW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="var(--text-dim)">Week</text>

        {/* Bars */}
        {scores.map((pts, i) => pts > 0 && (
          <rect
            key={i}
            x={toX(i) - 8}
            y={toY(pts)}
            width={16}
            height={toY(minPts) - toY(pts)}
            fill={color}
            opacity="0.35"
            rx="2"
          >
            <title>Wk {weeks[i]}: {pts.toFixed(2)}</title>
          </rect>
        ))}

        {/* 3-week rolling avg line */}
        <polyline
          points={rolling.map((v, i) => v > 0 ? `${toX(i)},${toY(v)}` : null).filter(Boolean).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {rolling.map((v, i) => v > 0 && (
          <circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill={color}>
            <title>3-wk avg at Wk {weeks[i]}: {v.toFixed(2)}</title>
          </circle>
        ))}
      </svg>

      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
        <span><span style={{ background: color, opacity: 0.4, display: 'inline-block', width: 12, height: 12, borderRadius: 2, marginRight: 4 }} />Weekly score</span>
        <span><span style={{ background: color, display: 'inline-block', width: 20, height: 3, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />3-week rolling avg</span>
      </div>
    </div>
  );
}
