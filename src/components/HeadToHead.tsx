import { useState, useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

export default function HeadToHead({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  const [teamA, setTeamA] = useState<number>(rosters[0]?.roster_id ?? 0);
  const [teamB, setTeamB] = useState<number>(rosters[1]?.roster_id ?? 0);

  const games = useMemo(() => {
    if (!seasonMatchups) return [];
    const results: { week: number; ptsA: number; ptsB: number }[] = [];
    for (const [weekStr, matchups] of Object.entries(seasonMatchups)) {
      const week = Number(weekStr);
      const mA = matchups.find(m => m.roster_id === teamA);
      const mB = matchups.find(m => m.roster_id === teamB);
      if (mA && mB && mA.matchup_id === mB.matchup_id) {
        results.push({ week, ptsA: mA.points, ptsB: mB.points });
      }
    }
    return results.sort((a, b) => a.week - b.week);
  }, [seasonMatchups, teamA, teamB]);

  const winsA = games.filter(g => g.ptsA > g.ptsB).length;
  const winsB = games.filter(g => g.ptsB > g.ptsA).length;
  const totalA = games.reduce((s, g) => s + g.ptsA, 0);
  const totalB = games.reduce((s, g) => s + g.ptsB, 0);

  const userA = userMap.get(rosters.find(r => r.roster_id === teamA)?.owner_id ?? '');
  const userB = userMap.get(rosters.find(r => r.roster_id === teamB)?.owner_id ?? '');

  if (isLoading) return <div className="loading">Loading matchup history…</div>;

  const teamLabel = (rosterId: number) => {
    const r = rosters.find(x => x.roster_id === rosterId);
    const u = userMap.get(r?.owner_id ?? '');
    return u?.display_name ?? u?.username ?? `Team ${rosterId}`;
  };

  return (
    <div className="h2h-wrap">
      <div className="h2h-selectors">
        <select
          className="h2h-select"
          value={teamA}
          onChange={e => setTeamA(Number(e.target.value))}
        >
          {rosters.map(r => (
            <option key={r.roster_id} value={r.roster_id}>{teamLabel(r.roster_id)}</option>
          ))}
        </select>
        <span className="h2h-vs">vs</span>
        <select
          className="h2h-select"
          value={teamB}
          onChange={e => setTeamB(Number(e.target.value))}
        >
          {rosters.map(r => (
            <option key={r.roster_id} value={r.roster_id}>{teamLabel(r.roster_id)}</option>
          ))}
        </select>
      </div>

      {games.length === 0 ? (
        <div className="empty">These teams haven't faced each other this season.</div>
      ) : (
        <>
          <div className="h2h-summary">
            <div className={`h2h-summary-side ${winsA > winsB ? 'h2h-leader' : ''}`}>
              {userA && avatarUrl(userA.avatar) && (
                <img loading="lazy" src={avatarUrl(userA.avatar)!} alt="" className="avatar-sm" />
              )}
              <div>
                <div className="h2h-summary-name">{teamLabel(teamA)}</div>
                <div className="h2h-summary-record">{winsA}-{winsB} · {totalA.toFixed(1)} pts</div>
              </div>
            </div>
            <div className="h2h-summary-score">{winsA} – {winsB}</div>
            <div className={`h2h-summary-side right ${winsB > winsA ? 'h2h-leader' : ''}`}>
              <div>
                <div className="h2h-summary-name">{teamLabel(teamB)}</div>
                <div className="h2h-summary-record">{winsB}-{winsA} · {totalB.toFixed(1)} pts</div>
              </div>
              {userB && avatarUrl(userB.avatar) && (
                <img loading="lazy" src={avatarUrl(userB.avatar)!} alt="" className="avatar-sm" />
              )}
            </div>
          </div>

          <ul className="h2h-games">
            {games.map(({ week, ptsA, ptsB }) => {
              const aWins = ptsA > ptsB;
              return (
                <li key={week} className="h2h-game">
                  <span className="h2h-week">Wk {week}</span>
                  <span className={`h2h-score ${aWins ? 'h2h-win' : 'h2h-loss'}`}>{ptsA.toFixed(2)}</span>
                  <span className="h2h-game-vs">–</span>
                  <span className={`h2h-score ${!aWins ? 'h2h-win' : 'h2h-loss'}`}>{ptsB.toFixed(2)}</span>
                  <span className={`h2h-result ${aWins ? 'h2h-win' : 'h2h-loss'}`}>
                    {aWins ? `${teamLabel(teamA)} wins` : `${teamLabel(teamB)} wins`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
