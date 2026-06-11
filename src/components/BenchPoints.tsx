import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

function teamName(r: SleeperRoster, userMap: Map<string, SleeperUser>) {
  const u = userMap.get(r.owner_id);
  return u?.display_name ?? u?.username ?? `Team ${r.roster_id}`;
}

export default function BenchPoints({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading bench data…</div>;
  if (!seasonMatchups) return <div className="empty">No season data yet.</div>;

  // Per team: weekly bench pts, total bench pts, worst single week
  interface TeamStats {
    rosterId: number;
    totalBench: number;
    totalStarted: number;
    weeklyBench: { week: number; bench: number; started: number }[];
    worstWeek: { week: number; bench: number } | null;
    bestWeek: { week: number; bench: number } | null;
  }

  const statsMap = new Map<number, TeamStats>();
  for (const r of rosters) {
    statsMap.set(r.roster_id, { rosterId: r.roster_id, totalBench: 0, totalStarted: 0, weeklyBench: [], worstWeek: null, bestWeek: null });
  }

  for (const [weekStr, matchups] of Object.entries(seasonMatchups)) {
    const week = Number(weekStr);
    for (const m of matchups) {
      const stat = statsMap.get(m.roster_id);
      if (!stat) continue;
      const pts = m.players_points ?? {};
      const starters = new Set(m.starters ?? []);
      let startedPts = 0;
      let benchPts = 0;
      for (const [pid, p] of Object.entries(pts)) {
        if (starters.has(pid)) startedPts += p;
        else benchPts += p;
      }
      stat.totalBench += benchPts;
      stat.totalStarted += startedPts;
      stat.weeklyBench.push({ week, bench: benchPts, started: startedPts });
      if (!stat.worstWeek || benchPts > stat.worstWeek.bench) stat.worstWeek = { week, bench: benchPts };
      if (!stat.bestWeek || benchPts < stat.bestWeek.bench) stat.bestWeek = { week, bench: benchPts };
    }
  }

  const rows = [...statsMap.values()]
    .filter(s => s.weeklyBench.length > 0)
    .sort((a, b) => b.totalBench - a.totalBench);

  const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);
  const maxBench = Math.max(...rows.map(r => r.totalBench), 1);

  return (
    <div className="bench-wrap">
      <div className="bench-table-section">
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Total Bench Pts</th>
              <th>Avg/Wk</th>
              <th>Worst Week</th>
              <th>Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const r = rosters.find(x => x.roster_id === s.rosterId)!;
              const u = userMap.get(r.owner_id);
              const av = u ? avatarUrl(u.avatar) : null;
              const avg = s.weeklyBench.length > 0 ? s.totalBench / s.weeklyBench.length : 0;
              const total = s.totalBench + s.totalStarted;
              const efficiency = total > 0 ? (s.totalStarted / total) * 100 : 0;
              const barW = (s.totalBench / maxBench) * 100;
              return (
                <tr key={s.rosterId}>
                  <td className="rank-cell">{i + 1}</td>
                  <td className="team-cell">
                    {av && <img src={av} alt="" className="avatar-xs" />}
                    <span>{teamName(r, userMap)}</span>
                  </td>
                  <td>
                    <div className="bench-bar-wrap">
                      <div className="bench-bar" style={{ width: `${barW}%` }} />
                      <span>{s.totalBench.toFixed(1)}</span>
                    </div>
                  </td>
                  <td>{avg.toFixed(1)}</td>
                  <td className="bench-worst">
                    {s.worstWeek ? <><span className="tx-type tx-waiver">Wk {s.worstWeek.week}</span> {s.worstWeek.bench.toFixed(1)}</> : '—'}
                  </td>
                  <td>
                    <span style={{ color: efficiency >= 65 ? 'var(--green)' : efficiency >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                      {efficiency.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Weekly heatmap */}
      <div className="bench-heatmap-section">
        <div className="roster-section-title" style={{ marginBottom: '0.8rem' }}>Weekly Bench Points Heatmap</div>
        <div className="bench-heatmap">
          <div className="bench-heatmap-header">
            <div className="bench-heatmap-team-col" />
            {weeks.map(w => <div key={w} className="bench-heatmap-wk">W{w}</div>)}
          </div>
          {rows.map(s => {
            const r = rosters.find(x => x.roster_id === s.rosterId)!;
            const byWeek = new Map(s.weeklyBench.map(w => [w.week, w.bench]));
            const allPts = s.weeklyBench.map(w => w.bench);
            const maxPt = Math.max(...allPts, 1);
            return (
              <div key={s.rosterId} className="bench-heatmap-row">
                <div className="bench-heatmap-team-col">{teamName(r, userMap)}</div>
                {weeks.map(w => {
                  const pts = byWeek.get(w) ?? 0;
                  const intensity = pts / maxPt;
                  const bg = `rgba(232,80,10,${(intensity * 0.7 + 0.05).toFixed(2)})`;
                  return (
                    <div key={w} className="bench-heatmap-cell" style={{ background: bg }} title={`Wk ${w}: ${pts.toFixed(1)} bench pts`}>
                      <span>{pts > 0 ? pts.toFixed(0) : ''}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
