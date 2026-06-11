import { useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup, SleeperLeague } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  league: SleeperLeague | undefined;
  isLoading: boolean;
}

function sampleNormal(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.max(0, mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}

const N_SIMS = 4000;

export default function PlayoffOdds({ rosters, userMap, seasonMatchups, league, isLoading }: Props) {
  const result = useMemo(() => {
    if (!seasonMatchups || !rosters.length || !league) return null;

    const playoffWeekStart = league.settings.playoff_week_start ?? 15;
    const currentWeek = league.settings.leg ?? 14;
    const playoffSpots = league.settings.playoff_teams ?? Math.floor(rosters.length / 2);
    const remainingWeeks = Math.max(0, playoffWeekStart - 1 - currentWeek);

    const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);

    const teamStats = rosters.map(r => {
      const scores = weeks
        .map(w => seasonMatchups[w].find(m => m.roster_id === r.roster_id)?.points ?? 0)
        .filter(p => p > 0);
      const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
      const variance = scores.length > 1
        ? scores.reduce((s, p) => s + (p - mean) ** 2, 0) / scores.length
        : 400;
      return { rosterId: r.roster_id, mean, std: Math.sqrt(variance), wins: r.settings.wins ?? 0 };
    });

    if (remainingWeeks === 0) {
      const sorted = [...teamStats].sort((a, b) => {
        const wa = a.wins, wb = b.wins;
        if (wa !== wb) return wb - wa;
        const ra = rosters.find(r => r.roster_id === a.rosterId)!;
        const rb = rosters.find(r => r.roster_id === b.rosterId)!;
        const pfa = (ra.settings.fpts ?? 0) + (ra.settings.fpts_decimal ?? 0) / 100;
        const pfb = (rb.settings.fpts ?? 0) + (rb.settings.fpts_decimal ?? 0) / 100;
        return pfb - pfa;
      });
      return { playoffSpots, remainingWeeks, odds: new Map(sorted.map((t, i) => [t.rosterId, i < playoffSpots ? 1 : 0])) };
    }

    const playoffCount = new Map<number, number>(teamStats.map(t => [t.rosterId, 0]));

    for (let sim = 0; sim < N_SIMS; sim++) {
      const wins = new Map<number, number>(teamStats.map(t => [t.rosterId, t.wins]));
      for (let w = 0; w < remainingWeeks; w++) {
        const shuffled = [...teamStats].sort(() => Math.random() - 0.5);
        for (let i = 0; i + 1 < shuffled.length; i += 2) {
          const sA = sampleNormal(shuffled[i].mean, shuffled[i].std);
          const sB = sampleNormal(shuffled[i + 1].mean, shuffled[i + 1].std);
          if (sA > sB) wins.set(shuffled[i].rosterId, (wins.get(shuffled[i].rosterId) ?? 0) + 1);
          else wins.set(shuffled[i + 1].rosterId, (wins.get(shuffled[i + 1].rosterId) ?? 0) + 1);
        }
      }
      const sorted = [...teamStats].sort((a, b) => (wins.get(b.rosterId) ?? 0) - (wins.get(a.rosterId) ?? 0));
      for (let i = 0; i < playoffSpots; i++) {
        const id = sorted[i].rosterId;
        playoffCount.set(id, (playoffCount.get(id) ?? 0) + 1);
      }
    }

    const odds = new Map([...playoffCount.entries()].map(([id, c]) => [id, c / N_SIMS]));
    return { playoffSpots, remainingWeeks, odds };
  }, [seasonMatchups, rosters, league]);

  if (isLoading || !result) return <div className="loading">Running playoff simulations…</div>;

  const { playoffSpots, remainingWeeks, odds } = result;

  const rows = [...rosters]
    .sort((a, b) => (odds.get(b.roster_id) ?? 0) - (odds.get(a.roster_id) ?? 0));

  return (
    <div>
      <p className="pr-formula">
        {remainingWeeks === 0
          ? `Season complete. Top ${playoffSpots} teams make playoffs.`
          : `${N_SIMS.toLocaleString()} simulations · ${remainingWeeks} week${remainingWeeks > 1 ? 's' : ''} remaining · top ${playoffSpots} make playoffs.`}
      </p>
      <table className="standings-table">
        <thead>
          <tr><th>#</th><th>Team</th><th>Record</th><th>Playoff %</th></tr>
        </thead>
        <tbody>
          {rows.map((roster, i) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            const prob = (odds.get(roster.roster_id) ?? 0) * 100;
            const record = `${roster.settings.wins ?? 0}-${roster.settings.losses ?? 0}`;
            const color = prob >= 80 ? 'var(--green)' : prob >= 40 ? 'var(--yellow)' : 'var(--red)';
            return (
              <tr key={roster.roster_id} className={i < playoffSpots ? 'playoff-spot' : ''}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                <td>{record}</td>
                <td>
                  <div className="odds-bar-wrap">
                    <div className="odds-bar" style={{ width: `${prob.toFixed(0)}%`, background: color }} />
                    <span style={{ color }}>{prob.toFixed(0)}%</span>
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
