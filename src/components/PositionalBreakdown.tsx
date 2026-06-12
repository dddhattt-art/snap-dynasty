import { useState } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  players: PlayersMap | undefined;
  isLoading: boolean;
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const POS_COLORS: Record<string, string> = {
  QB: '#6c63ff', RB: '#4caf73', WR: '#f0b429', TE: '#e07c5c', K: '#8b90b8', DEF: '#5cade0',
};

export default function PositionalBreakdown({ rosters, userMap, seasonMatchups, players, isLoading }: Props) {
  const [sortPos, setSortPos] = useState<string>('QB');

  if (isLoading) return <div className="loading">Computing positional breakdown…</div>;
  if (!seasonMatchups || !players || !rosters.length) return <div className="empty">No data available.</div>;

  const teamPts = new Map<number, Record<string, number>>();
  for (const r of rosters) teamPts.set(r.roster_id, Object.fromEntries(POSITIONS.map(p => [p, 0])));

  for (const matchups of Object.values(seasonMatchups)) {
    for (const m of matchups) {
      const entry = teamPts.get(m.roster_id);
      if (!entry) continue;
      for (const starterId of m.starters ?? []) {
        const pos = players[starterId]?.position ?? '';
        if (POSITIONS.includes(pos)) {
          entry[pos] = (entry[pos] ?? 0) + (m.players_points?.[starterId] ?? 0);
        }
      }
    }
  }

  const rows = rosters
    .map(r => ({ roster: r, pts: teamPts.get(r.roster_id) ?? {} }))
    .sort((a, b) => (b.pts[sortPos] ?? 0) - (a.pts[sortPos] ?? 0));

  return (
    <div>
      <p className="pr-formula">Season points scored by starters at each position. Click a column to sort.</p>
      <table className="standings-table">
        <thead>
          <tr>
            <th>Team</th>
            {POSITIONS.map(pos => (
              <th
                key={pos}
                style={{ color: POS_COLORS[pos], cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setSortPos(pos)}
              >
                {pos} {sortPos === pos ? '↓' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ roster, pts }) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            return (
              <tr key={roster.roster_id}>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                {POSITIONS.map(pos => (
                  <td key={pos} style={{ color: sortPos === pos ? POS_COLORS[pos] : undefined, fontWeight: sortPos === pos ? 600 : undefined }}>
                    {(pts[pos] ?? 0).toFixed(0)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
