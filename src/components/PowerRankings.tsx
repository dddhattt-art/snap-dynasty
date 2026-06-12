import { useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

function rankAsc<T>(items: T[], getValue: (item: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  return new Map(sorted.map((item, i) => [item, sorted.length - i]));
}

export default function PowerRankings({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Computing power rankings…</div>;
  if (!rosters.length) return <div className="empty">No data available.</div>;

  const ranked = useMemo(() => {
    const weeks = seasonMatchups ? Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b) : [];
    const recentWeeks = weeks.slice(-3);

    const recentPts = new Map<number, number>();
    for (const roster of rosters) {
      let pts = 0;
      for (const week of recentWeeks) {
        const matchup = (seasonMatchups?.[week] ?? []).find(m => m.roster_id === roster.roster_id);
        if (matchup) pts += matchup.points;
      }
      recentPts.set(roster.roster_id, pts);
    }

    const pf = (r: SleeperRoster) => (r.settings.fpts ?? 0) + (r.settings.fpts_decimal ?? 0) / 100;
    const winsRank = rankAsc(rosters, r => (r.settings.wins ?? 0) + pf(r) / 10000);
    const pfRank = rankAsc(rosters, pf);
    const recentRank = rankAsc(rosters, r => recentPts.get(r.roster_id) ?? 0);

    const standingsRank = new Map(
      [...rosters]
        .sort((a, b) => {
          const wd = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
          return wd !== 0 ? wd : pf(b) - pf(a);
        })
        .map((r, i) => [r.roster_id, i + 1])
    );

    const score = (r: SleeperRoster) => {
      const n = rosters.length;
      return (winsRank.get(r) ?? 1) / n * 0.40 +
             (pfRank.get(r) ?? 1) / n * 0.35 +
             (recentRank.get(r) ?? 1) / n * 0.25;
    };

    return { rows: [...rosters].sort((a, b) => score(b) - score(a)), standingsRank, recentPts, recentWeeks };
  }, [rosters, seasonMatchups]);

  const { rows, standingsRank, recentPts, recentWeeks } = ranked;

  return (
    <div className="pr-wrap">
      <p className="pr-formula">Wins 40% · Points For 35% · Last {recentWeeks.length} weeks 25%</p>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Δ</th>
            <th>W-L</th>
            <th>PF</th>
            <th>Recent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((roster, i) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            const standRank = standingsRank.get(roster.roster_id) ?? i + 1;
            const delta = standRank - (i + 1);
            const record = `${roster.settings.wins ?? 0}-${roster.settings.losses ?? 0}`;
            const recent = (recentPts.get(roster.roster_id) ?? 0).toFixed(1);

            return (
              <tr key={roster.roster_id}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                <td>
                  {delta > 0
                    ? <span className="delta-up">▲{delta}</span>
                    : delta < 0
                    ? <span className="delta-down">▼{Math.abs(delta)}</span>
                    : <span className="delta-flat">—</span>}
                </td>
                <td>{record}</td>
                <td>{((roster.settings.fpts ?? 0) + (roster.settings.fpts_decimal ?? 0) / 100).toFixed(1)}</td>
                <td>{recent}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
