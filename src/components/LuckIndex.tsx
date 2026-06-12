import { useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

export default function LuckIndex({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Computing luck index…</div>;
  if (!seasonMatchups || !rosters.length) return <div className="empty">No season data yet.</div>;

  const rows = useMemo(() => {
    const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);
    const totalGames = weeks.length * (rosters.length - 1);

    const allPlayWins = new Map<number, number>();
    for (const roster of rosters) allPlayWins.set(roster.roster_id, 0);

    for (const week of weeks) {
      const matchups = seasonMatchups[week];
      const scores = rosters.map(r => ({
        rosterId: r.roster_id,
        pts: matchups.find(m => m.roster_id === r.roster_id)?.points ?? 0,
      }));
      for (const a of scores) {
        const wins = scores.filter(b => b.rosterId !== a.rosterId && a.pts > b.pts).length;
        allPlayWins.set(a.rosterId, (allPlayWins.get(a.rosterId) ?? 0) + wins);
      }
    }

    return rosters.map(r => {
      const actualWins = r.settings.wins ?? 0;
      const apWins = allPlayWins.get(r.roster_id) ?? 0;
      const apLosses = totalGames - apWins;
      const expectedWins = totalGames > 0 ? (apWins / totalGames) * weeks.length : 0;
      const luck = actualWins - expectedWins;
      return { roster: r, actualWins, apWins, apLosses, luck };
    }).sort((a, b) => b.luck - a.luck);
  }, [rosters, seasonMatchups]);

  return (
    <div>
      <p className="pr-formula">
        All-play W-L: how you'd do if you played every team every week.
        Luck = actual wins minus expected wins.
      </p>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th><th>Team</th><th>Actual</th><th>All-Play</th><th>Luck</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ roster, actualWins, apWins, apLosses, luck }, i) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            const record = `${actualWins}-${roster.settings.losses ?? 0}`;
            const apRecord = `${apWins}-${apLosses}`;
            return (
              <tr key={roster.roster_id}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                <td>{record}</td>
                <td>{apRecord}</td>
                <td>
                  <span className={luck > 0.5 ? 'delta-up' : luck < -0.5 ? 'delta-down' : 'delta-flat'}>
                    {luck > 0 ? '+' : ''}{luck.toFixed(1)}
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
