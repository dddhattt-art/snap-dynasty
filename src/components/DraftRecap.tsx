import type { SleeperDraftPick, SleeperRoster, SleeperUser } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  picks: SleeperDraftPick[];
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  isLoading: boolean;
}

const POS_COLOR: Record<string, string> = {
  QB: 'var(--accent)',
  RB: 'var(--green)',
  WR: 'var(--yellow)',
  TE: '#e07c5c',
  K: 'var(--text-dim)',
  DEF: '#5cade0',
};

export default function DraftRecap({ picks, rosters, userMap, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading draft…</div>;
  if (!picks.length) return <div className="empty">Draft data not available.</div>;

  const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));
  const rounds = [...new Set(picks.map(p => p.round))].sort((a, b) => a - b);
  const byRound = new Map<number, SleeperDraftPick[]>();
  for (const pick of picks) {
    const arr = byRound.get(pick.round) ?? [];
    arr.push(pick);
    byRound.set(pick.round, arr);
  }

  return (
    <div className="draft-wrap">
      {rounds.map(round => {
        const roundPicks = (byRound.get(round) ?? []).sort((a, b) => a.draft_slot - b.draft_slot);
        return (
          <div key={round} className="draft-round">
            <div className="draft-round-label">Round {round}</div>
            <div className="draft-picks-grid">
              {roundPicks.map(pick => {
                const ownerId = rosterOwner.get(pick.roster_id) ?? pick.picked_by;
                const user = userMap.get(ownerId);
                const av = user ? avatarUrl(user.avatar) : null;
                const pos = pick.metadata?.position ?? '?';
                return (
                  <div key={pick.pick_no} className="draft-pick">
                    <div className="draft-pick-header">
                      <span className="draft-pick-no">#{pick.pick_no}</span>
                      <span className="draft-pos" style={{ color: POS_COLOR[pos] ?? 'var(--text-dim)' }}>{pos}</span>
                    </div>
                    <div className="draft-player-name">{pick.metadata?.player_name ?? pick.player_id}</div>
                    <div className="draft-pick-owner">
                      {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                      <span>{user?.display_name ?? user?.username ?? `Team ${pick.roster_id}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
