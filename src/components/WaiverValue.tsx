import type { SleeperTransaction, SleeperRoster, SleeperUser, SleeperMatchup, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  seasonTransactions: Record<number, SleeperTransaction[]> | undefined;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  players: PlayersMap | undefined;
  userMap: Map<string, SleeperUser>;
  rosters: SleeperRoster[];
  isLoading: boolean;
}

export default function WaiverValue({ seasonTransactions, seasonMatchups, players, userMap, rosters, isLoading }: Props) {
  if (isLoading) return <div className="loading">Computing waiver value…</div>;
  if (!seasonTransactions || !seasonMatchups) return <div className="empty">No data available.</div>;

  const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

  const playerWeeklyPts = new Map<string, Map<number, number>>();
  for (const [weekStr, matchups] of Object.entries(seasonMatchups)) {
    const week = Number(weekStr);
    for (const m of matchups) {
      for (const [pid, pts] of Object.entries(m.players_points ?? {})) {
        if (!playerWeeklyPts.has(pid)) playerWeeklyPts.set(pid, new Map());
        playerWeeklyPts.get(pid)!.set(week, pts);
      }
    }
  }

  const teamValue = new Map<string, { total: number; picks: { player: string; pts: number; week: number }[] }>();
  for (const roster of rosters) {
    teamValue.set(rosterOwner.get(roster.roster_id) ?? '', { total: 0, picks: [] });
  }

  for (const [weekStr, txs] of Object.entries(seasonTransactions)) {
    const addWeek = Number(weekStr);
    for (const tx of txs) {
      if (tx.type !== 'waiver' && tx.type !== 'free_agent') continue;
      if (tx.status !== 'complete') continue;
      for (const [pid, rosterId] of Object.entries(tx.adds ?? {})) {
        const ownerId = rosterOwner.get(rosterId) ?? '';
        if (!teamValue.has(ownerId)) continue;
        const ptsAfterAdd = [...(playerWeeklyPts.get(pid) ?? new Map()).entries()]
          .filter(([w]) => w > addWeek)
          .reduce((s, [, p]) => s + p, 0);
        const playerName = players?.[pid]?.full_name ?? pid;
        const entry = teamValue.get(ownerId)!;
        entry.total += ptsAfterAdd;
        entry.picks.push({ player: playerName, pts: ptsAfterAdd, week: addWeek });
      }
    }
  }

  const stats = [...teamValue.entries()]
    .map(([ownerId, { total, picks }]) => {
      const best = [...picks].sort((a, b) => b.pts - a.pts)[0];
      return { ownerId, total, best };
    })
    .filter(s => s.total > 0 || userMap.has(s.ownerId))
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <p className="pr-formula">Total fantasy points scored by waiver/FA pickups after the week they were added.</p>
      <table className="standings-table">
        <thead>
          <tr><th>#</th><th>Team</th><th>Total Waiver Pts</th><th>Best Add</th></tr>
        </thead>
        <tbody>
          {stats.map(({ ownerId, total, best }, i) => {
            const user = userMap.get(ownerId);
            const av = user ? avatarUrl(user.avatar) : null;
            return (
              <tr key={ownerId}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? ownerId}</span>
                </td>
                <td><span className="delta-up">{total.toFixed(1)}</span></td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  {best ? `${best.player} (${best.pts.toFixed(0)} pts, Wk ${best.week})` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
