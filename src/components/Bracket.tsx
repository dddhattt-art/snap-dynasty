import type { SleeperBracketMatch, SleeperRoster, SleeperUser } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  winners: SleeperBracketMatch[];
  losers: SleeperBracketMatch[];
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  isLoading: boolean;
}

function teamName(
  rosterId: number | null,
  rosters: SleeperRoster[],
  userMap: Map<string, SleeperUser>
): { name: string; avatar: string | null } {
  if (!rosterId) return { name: 'TBD', avatar: null };
  const roster = rosters.find(r => r.roster_id === rosterId);
  if (!roster) return { name: `Team ${rosterId}`, avatar: null };
  const user = userMap.get(roster.owner_id);
  return {
    name: user?.display_name ?? user?.username ?? `Team ${rosterId}`,
    avatar: user ? avatarUrl(user.avatar) : null,
  };
}

function BracketMatch({
  match,
  rosters,
  userMap,
}: {
  match: SleeperBracketMatch;
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
}) {
  const t1 = teamName(match.t1, rosters, userMap);
  const t2 = teamName(match.t2, rosters, userMap);

  return (
    <div className="bracket-match">
      <div className={`bracket-team ${match.w === match.t1 ? 'bracket-winner' : match.l === match.t1 ? 'bracket-loser' : ''}`}>
        {t1.avatar && <img loading="lazy" src={t1.avatar} alt="" className="avatar-xs" />}
        <span>{t1.name}</span>
      </div>
      <div className={`bracket-team ${match.w === match.t2 ? 'bracket-winner' : match.l === match.t2 ? 'bracket-loser' : ''}`}>
        {t2.avatar && <img loading="lazy" src={t2.avatar} alt="" className="avatar-xs" />}
        <span>{t2.name}</span>
      </div>
    </div>
  );
}

function BracketRound({
  round,
  matches,
  rosters,
  userMap,
  label,
}: {
  round: number;
  matches: SleeperBracketMatch[];
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  label?: string;
}) {
  const roundMatches = matches.filter(m => m.r === round);
  if (!roundMatches.length) return null;
  return (
    <div className="bracket-round">
      <div className="bracket-round-label">{label ?? `Round ${round}`}</div>
      {roundMatches.map(m => (
        <BracketMatch key={m.m} match={m} rosters={rosters} userMap={userMap} />
      ))}
    </div>
  );
}

export default function Bracket({ winners, losers, rosters, userMap, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading bracket…</div>;
  if (!winners.length) return <div className="empty">Bracket not available yet.</div>;

  const winnerRounds = [...new Set(winners.map(m => m.r))].sort((a, b) => a - b);
  const loserRounds = [...new Set(losers.map(m => m.r))].sort((a, b) => a - b);

  const winnerLabels: Record<number, string> = {};
  const maxR = Math.max(...winnerRounds);
  winnerLabels[maxR] = 'Championship';
  if (maxR - 1 > 0) winnerLabels[maxR - 1] = 'Semifinals';

  return (
    <div className="bracket-wrap">
      <h4 className="bracket-title">Winners Bracket</h4>
      <div className="bracket-grid">
        {winnerRounds.map(r => (
          <BracketRound
            key={r}
            round={r}
            matches={winners}
            rosters={rosters}
            userMap={userMap}
            label={winnerLabels[r] ?? `Round ${r}`}
          />
        ))}
      </div>

      {losers.length > 0 && (
        <>
          <h4 className="bracket-title" style={{ marginTop: '2rem' }}>Consolation Bracket</h4>
          <div className="bracket-grid">
            {loserRounds.map(r => (
              <BracketRound
                key={r}
                round={r}
                matches={losers}
                rosters={rosters}
                userMap={userMap}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
