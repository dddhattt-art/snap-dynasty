import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

export default function ScheduleDifficulty({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Computing schedule difficulty…</div>;
  if (!seasonMatchups || !rosters.length) return <div className="empty">No season data yet.</div>;

  const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);

  const seasonAvg = new Map<number, number>();
  for (const r of rosters) {
    const scores = weeks.map(w => seasonMatchups[w].find(m => m.roster_id === r.roster_id)?.points ?? 0).filter(p => p > 0);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    seasonAvg.set(r.roster_id, avg);
  }

  const leagueAvg = [...seasonAvg.values()].reduce((a, b) => a + b, 0) / seasonAvg.size;

  const stats = rosters.map(r => {
    const opponentAvgs: number[] = [];
    for (const week of weeks) {
      const myMatchup = seasonMatchups[week].find(m => m.roster_id === r.roster_id);
      if (!myMatchup) continue;
      const opp = seasonMatchups[week].find(m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== r.roster_id);
      if (opp) opponentAvgs.push(seasonAvg.get(opp.roster_id) ?? 0);
    }
    const avgOppStrength = opponentAvgs.length ? opponentAvgs.reduce((a, b) => a + b, 0) / opponentAvgs.length : 0;
    const difficulty = avgOppStrength - leagueAvg;
    return { roster: r, avgOppStrength, difficulty };
  }).sort((a, b) => b.avgOppStrength - a.avgOppStrength);

  return (
    <div>
      <p className="pr-formula">Average strength of opponents faced, measured by their season scoring average. League avg: {leagueAvg.toFixed(1)} pts/week.</p>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th><th>Team</th><th>Avg Opp Score</th><th>vs League Avg</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(({ roster, avgOppStrength, difficulty }, i) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            return (
              <tr key={roster.roster_id}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                <td>{avgOppStrength.toFixed(1)}</td>
                <td>
                  <span className={difficulty > 1 ? 'delta-down' : difficulty < -1 ? 'delta-up' : 'delta-flat'}>
                    {difficulty > 0 ? '+' : ''}{difficulty.toFixed(1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
