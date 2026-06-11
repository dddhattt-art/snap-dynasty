import { useState, useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

function teamLabel(rosterId: number, rosters: SleeperRoster[], userMap: Map<string, SleeperUser>): string {
  const r = rosters.find(x => x.roster_id === rosterId);
  const u = userMap.get(r?.owner_id ?? '');
  return u?.display_name ?? u?.username ?? `Team ${rosterId}`;
}

export default function WhatIfStandings({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  const [teamA, setTeamA] = useState<number>(rosters[0]?.roster_id ?? 0);
  const [teamB, setTeamB] = useState<number>(rosters[1]?.roster_id ?? 0);

  const swappableGames = useMemo(() => {
    if (!seasonMatchups) return [];
    const games: { week: number; ptsA: number; ptsB: number }[] = [];
    for (const [weekStr, matchups] of Object.entries(seasonMatchups)) {
      const week = Number(weekStr);
      const mA = matchups.find(m => m.roster_id === teamA);
      const mB = matchups.find(m => m.roster_id === teamB);
      if (mA && mB && mA.matchup_id === mB.matchup_id) {
        games.push({ week, ptsA: mA.points, ptsB: mB.points });
      }
    }
    return games.sort((a, b) => a.week - b.week);
  }, [seasonMatchups, teamA, teamB]);

  const [swappedWeeks, setSwappedWeeks] = useState<Set<number>>(new Set());

  const toggleWeek = (week: number) => {
    setSwappedWeeks(prev => {
      const next = new Set(prev);
      next.has(week) ? next.delete(week) : next.add(week);
      return next;
    });
  };

  const adjustedStandings = useMemo(() => {
    if (!seasonMatchups) return [];
    const winsAdj = new Map(rosters.map(r => [r.roster_id, r.settings.wins ?? 0]));

    for (const { week, ptsA, ptsB } of swappableGames) {
      if (!swappedWeeks.has(week)) continue;
      const actualWinnerA = ptsA > ptsB;
      if (actualWinnerA) {
        winsAdj.set(teamA, (winsAdj.get(teamA) ?? 0) - 1);
        winsAdj.set(teamB, (winsAdj.get(teamB) ?? 0) + 1);
      } else {
        winsAdj.set(teamB, (winsAdj.get(teamB) ?? 0) - 1);
        winsAdj.set(teamA, (winsAdj.get(teamA) ?? 0) + 1);
      }
    }

    const pf = (r: SleeperRoster) => (r.settings.fpts ?? 0) + (r.settings.fpts_decimal ?? 0) / 100;
    return [...rosters].sort((a, b) => {
      const wd = (winsAdj.get(b.roster_id) ?? 0) - (winsAdj.get(a.roster_id) ?? 0);
      return wd !== 0 ? wd : pf(b) - pf(a);
    }).map(r => ({ roster: r, wins: winsAdj.get(r.roster_id) ?? 0 }));
  }, [rosters, swappableGames, swappedWeeks, seasonMatchups, teamA, teamB]);

  const originalRank = new Map(
    [...rosters]
      .sort((a, b) => {
        const wd = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
        const pfa = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100;
        const pfb = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100;
        return wd !== 0 ? wd : pfb - pfa;
      })
      .map((r, i) => [r.roster_id, i + 1])
  );

  if (isLoading) return <div className="loading">Loading what-if data…</div>;
  if (!seasonMatchups) return <div className="empty">No season data yet.</div>;

  return (
    <div className="h2h-wrap">
      <div className="h2h-selectors">
        <select className="h2h-select" value={teamA} onChange={e => { setTeamA(Number(e.target.value)); setSwappedWeeks(new Set()); }}>
          {rosters.map(r => <option key={r.roster_id} value={r.roster_id}>{teamLabel(r.roster_id, rosters, userMap)}</option>)}
        </select>
        <span className="h2h-vs">vs</span>
        <select className="h2h-select" value={teamB} onChange={e => { setTeamB(Number(e.target.value)); setSwappedWeeks(new Set()); }}>
          {rosters.map(r => <option key={r.roster_id} value={r.roster_id}>{teamLabel(r.roster_id, rosters, userMap)}</option>)}
        </select>
      </div>

      {swappableGames.length === 0 ? (
        <div className="empty">These teams haven't faced each other this season.</div>
      ) : (
        <>
          <p className="pr-formula">Toggle games to flip the result and see how standings change.</p>
          <div className="whatif-games">
            {swappableGames.map(({ week, ptsA, ptsB }) => {
              const swapped = swappedWeeks.has(week);
              const aWinsActual = ptsA > ptsB;
              const aWinsNow = swapped ? !aWinsActual : aWinsActual;
              return (
                <button key={week} className={`whatif-game ${swapped ? 'swapped' : ''}`} onClick={() => toggleWeek(week)}>
                  <span className={aWinsNow ? 'h2h-win' : 'h2h-loss'}>{teamLabel(teamA, rosters, userMap)} {ptsA.toFixed(1)}</span>
                  <span className="h2h-game-vs">–</span>
                  <span className={!aWinsNow ? 'h2h-win' : 'h2h-loss'}>{ptsB.toFixed(1)} {teamLabel(teamB, rosters, userMap)}</span>
                  <span className="whatif-wk">Wk {week}</span>
                  {swapped && <span className="whatif-flip">↩ flipped</span>}
                </button>
              );
            })}
          </div>

          <table className="standings-table" style={{ marginTop: '1.2rem' }}>
            <thead>
              <tr><th>#</th><th>Team</th><th>Wins</th><th>Δ Rank</th></tr>
            </thead>
            <tbody>
              {adjustedStandings.map(({ roster, wins }, i) => {
                const user = userMap.get(roster.owner_id);
                const av = user ? avatarUrl(user.avatar) : null;
                const origRank = originalRank.get(roster.roster_id) ?? i + 1;
                const delta = origRank - (i + 1);
                return (
                  <tr key={roster.roster_id} className={i < 6 ? 'playoff-spot' : ''}>
                    <td className="rank">{i + 1}</td>
                    <td className="team-cell">
                      {av && <img src={av} alt="" className="avatar-xs" />}
                      <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                    </td>
                    <td>{wins}</td>
                    <td>
                      {delta > 0 ? <span className="delta-up">▲{delta}</span>
                        : delta < 0 ? <span className="delta-down">▼{Math.abs(delta)}</span>
                        : <span className="delta-flat">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
