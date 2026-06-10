import type { SleeperRoster, SleeperUser } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
}

export default function Standings({ rosters, userMap }: Props) {
  const sorted = [...rosters].sort((a, b) => {
    const wDiff = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
    if (wDiff !== 0) return wDiff;
    const aFpts = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100;
    const bFpts = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100;
    return bFpts - aFpts;
  });

  if (!rosters.length) return <div className="loading">Loading standings…</div>;

  return (
    <table className="standings-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>W</th>
          <th>L</th>
          <th>T</th>
          <th>PF</th>
          <th>PA</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((roster, i) => {
          const user = userMap.get(roster.owner_id);
          const avatar = user ? avatarUrl(user.avatar) : null;
          const pf = (roster.settings.fpts ?? 0) + (roster.settings.fpts_decimal ?? 0) / 100;
          const pa = (roster.settings.fpts_against ?? 0) + (roster.settings.fpts_against_decimal ?? 0) / 100;

          return (
            <tr key={roster.roster_id} className={i < 6 ? 'playoff-spot' : ''}>
              <td className="rank">{i + 1}</td>
              <td className="team-cell">
                {avatar && <img src={avatar} alt="" className="avatar-xs" />}
                <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
              </td>
              <td>{roster.settings.wins ?? 0}</td>
              <td>{roster.settings.losses ?? 0}</td>
              <td>{roster.settings.ties ?? 0}</td>
              <td>{pf.toFixed(2)}</td>
              <td>{pa.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
