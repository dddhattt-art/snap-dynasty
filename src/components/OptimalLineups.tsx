import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

export default function OptimalLineups({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Computing optimal lineups…</div>;
  if (!seasonMatchups || !rosters.length) return <div className="empty">No season data yet.</div>;

  const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);

  const stats = rosters.map(r => {
    let actualTotal = 0, optimalTotal = 0, weeksPlayed = 0;
    for (const week of weeks) {
      const m = seasonMatchups[week].find(x => x.roster_id === r.roster_id);
      if (!m || !m.starters?.length) continue;
      const actual = (m.starters_points ?? []).reduce((s, p) => s + p, 0);
      const starterCount = m.starters.length;
      const allPts = Object.values(m.players_points ?? {}).sort((a, b) => b - a);
      const optimal = allPts.slice(0, starterCount).reduce((s, p) => s + p, 0);
      actualTotal += actual;
      optimalTotal += optimal;
      weeksPlayed++;
    }
    const efficiency = optimalTotal > 0 ? (actualTotal / optimalTotal) * 100 : 0;
    const leftOnBench = optimalTotal - actualTotal;
    return { roster: r, actualTotal, optimalTotal, leftOnBench, efficiency, weeksPlayed };
  }).sort((a, b) => b.efficiency - a.efficiency);

  return (
    <div>
      <p className="pr-formula">Optimal lineup = best possible starters each week. Efficiency = actual ÷ optimal.</p>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th><th>Team</th><th>Actual</th><th>Optimal</th><th>Left on Bench</th><th>Efficiency</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(({ roster, actualTotal, optimalTotal, leftOnBench, efficiency }, i) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            return (
              <tr key={roster.roster_id}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                <td>{actualTotal.toFixed(1)}</td>
                <td>{optimalTotal.toFixed(1)}</td>
                <td className="delta-down">−{leftOnBench.toFixed(1)}</td>
                <td>
                  <div className="eff-bar-wrap">
                    <div className="eff-bar" style={{ width: `${efficiency.toFixed(0)}%` }} />
                    <span>{efficiency.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
