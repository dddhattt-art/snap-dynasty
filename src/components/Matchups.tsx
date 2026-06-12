import type { SleeperMatchup, SleeperRoster, SleeperUser } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  matchups: SleeperMatchup[];
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  isLoading: boolean;
}

export default function Matchups({ matchups, rosters, userMap, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading matchups…</div>;
  if (!matchups.length) return <div className="empty">No matchups available for this week.</div>;

  const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

  const pairs = new Map<number, SleeperMatchup[]>();
  for (const m of matchups) {
    const group = pairs.get(m.matchup_id) ?? [];
    group.push(m);
    pairs.set(m.matchup_id, group);
  }

  return (
    <div className="matchup-list">
      {[...pairs.values()].map(pair => {
        const [a, b] = pair;
        if (!a || !b) return null;

        const userA = userMap.get(rosterOwner.get(a.roster_id) ?? '');
        const userB = userMap.get(rosterOwner.get(b.roster_id) ?? '');
        const avatarA = userA ? avatarUrl(userA.avatar) : null;
        const avatarB = userB ? avatarUrl(userB.avatar) : null;
        const aWins = a.points > b.points;
        const bWins = b.points > a.points;

        return (
          <div key={a.matchup_id} className="matchup-card">
            <div className={`matchup-side ${aWins ? 'winning' : ''}`}>
              {avatarA && <img loading="lazy" src={avatarA} alt="" className="avatar-sm" />}
              <span className="team-name">
                {userA?.display_name ?? userA?.username ?? `Team ${a.roster_id}`}
              </span>
              <span className="score">{a.points.toFixed(2)}</span>
            </div>
            <div className="matchup-vs">vs</div>
            <div className={`matchup-side right ${bWins ? 'winning' : ''}`}>
              <span className="score">{b.points.toFixed(2)}</span>
              <span className="team-name">
                {userB?.display_name ?? userB?.username ?? `Team ${b.roster_id}`}
              </span>
              {avatarB && <img loading="lazy" src={avatarB} alt="" className="avatar-sm" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
