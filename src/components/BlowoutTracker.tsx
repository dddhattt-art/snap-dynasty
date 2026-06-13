import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

const BLOWOUT = 30;
const CLOSE = 10;

export default function BlowoutTracker({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading game data…</div>;
  if (!seasonMatchups || !rosters.length) return <div className="empty">No season data yet.</div>;

  const weeks = Object.keys(seasonMatchups).map(Number);

  const stats = new Map(rosters.map(r => [r.roster_id, { blowoutW: 0, closeW: 0, normalW: 0, blowoutL: 0, closeL: 0, normalL: 0 }]));

  for (const week of weeks) {
    const matchups = seasonMatchups[week];
    const ids = new Set(matchups.map(m => m.matchup_id));
    for (const mid of ids) {
      const pair = matchups.filter(m => m.matchup_id === mid);
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      const margin = Math.abs(a.points - b.points);
      const winner = a.points > b.points ? a.roster_id : b.roster_id;
      const loser = a.points > b.points ? b.roster_id : a.roster_id;
      const sW = stats.get(winner);
      const sL = stats.get(loser);
      if (!sW || !sL) continue;
      if (margin >= BLOWOUT) { sW.blowoutW++; sL.blowoutL++; }
      else if (margin <= CLOSE) { sW.closeW++; sL.closeL++; }
      else { sW.normalW++; sL.normalL++; }
    }
  }

  const rows = rosters.map(r => ({ roster: r, ...stats.get(r.roster_id)! }))
    .sort((a, b) => (b.blowoutW + b.closeW + b.normalW) - (a.blowoutW + a.closeW + a.normalW));

  return (
    <div>
      <p className="pr-formula">Blowout = margin &gt;{BLOWOUT} pts · Close = margin &lt;{CLOSE} pts · Normal = everything else.</p>
      <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th>Team</th>
            <th style={{ color: 'var(--green)' }}>Blowout W</th>
            <th style={{ color: 'var(--green)' }}>Close W</th>
            <th>Normal W</th>
            <th>Normal L</th>
            <th style={{ color: 'var(--red)' }}>Close L</th>
            <th style={{ color: 'var(--red)' }}>Blowout L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ roster, blowoutW, closeW, normalW, blowoutL, closeL, normalL }) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            return (
              <tr key={roster.roster_id}>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                <td className="delta-up">{blowoutW || '—'}</td>
                <td style={{ color: 'var(--green)' }}>{closeW || '—'}</td>
                <td>{normalW || '—'}</td>
                <td>{normalL || '—'}</td>
                <td style={{ color: 'var(--red)' }}>{closeL || '—'}</td>
                <td className="delta-down">{blowoutL || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
