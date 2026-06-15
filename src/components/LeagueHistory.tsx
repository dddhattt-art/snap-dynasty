import { useState, useMemo } from 'react';
import type { SleeperLeague, SleeperRoster, SleeperUser, SleeperBracketMatch, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface SeasonData {
  league: SleeperLeague;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  bracket: SleeperBracketMatch[];
}

interface Props {
  history: SeasonData[] | undefined;
  allTimeMatchups: Record<string, Record<number, SleeperMatchup[]>> | undefined;
  userId?: string;
  isLoading: boolean;
  allTimeLoading?: boolean;
}

type View = 'standings' | 'seasons' | 'versus' | 'records';

const ACCENT_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981',
  '#f97316','#06b6d4','#84cc16','#6366f1','#14b8a6',
  '#e11d48','#64748b',
];

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

function pfVal(roster: SleeperRoster): number {
  return (roster.settings.fpts ?? 0) + (roster.settings.fpts_decimal ?? 0) / 100;
}

function getFinalists(bracket: SleeperBracketMatch[]): {
  first: number | null; second: number | null; third: number | null;
} {
  if (!bracket.length) return { first: null, second: null, third: null };
  const maxRound = Math.max(...bracket.map(m => m.r));
  const finals = bracket.filter(m => m.r === maxRound).sort((a, b) => (a.m ?? 0) - (b.m ?? 0));
  return {
    first: finals[0]?.w ?? null,
    second: finals[0]?.l ?? null,
    third: finals[1]?.w ?? null,
  };
}

function sortRosters(rosters: SleeperRoster[]) {
  return [...rosters].sort((a, b) => {
    const wd = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
    return wd !== 0 ? wd : pfVal(b) - pfVal(a);
  });
}

interface CareerStat {
  userId: string;
  wins: number; losses: number; ties: number; pf: number;
  championships: number; runnerUp: number; thirdPlace: number;
  playoffApps: number; seasons: number;
  firstSeason: string; lastSeason: string;
}

interface RecordEntry {
  icon: string; label: string; value: string; detail: string;
}

export default function LeagueHistory({ history, allTimeMatchups, userId, isLoading, allTimeLoading }: Props) {
  const [view, setView] = useState<View>('standings');
  const [versusTarget, setVersusTarget] = useState<string>('');

  // ── All hooks must run unconditionally before any early return ──

  const derived = useMemo(() => {
    if (!history?.length) return null;

    // User lookup
    const latestUserMap = new Map<string, SleeperUser>();
    for (const { users } of history) {
      for (const u of users) latestUserMap.set(u.user_id, u);
    }
    const allUserIds = [...latestUserMap.keys()];
    const userColorMap = new Map(allUserIds.map((uid, i) => [uid, ACCENT_COLORS[i % ACCENT_COLORS.length]]));

    // Career stats
    const career = new Map<string, CareerStat>();
    const mkCareer = (uid: string): CareerStat => ({
      userId: uid, wins: 0, losses: 0, ties: 0, pf: 0,
      championships: 0, runnerUp: 0, thirdPlace: 0,
      playoffApps: 0, seasons: 0, firstSeason: '9999', lastSeason: '0000',
    });

    for (const { league, rosters, bracket } of history) {
      const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));
      const { first: champRId, second: runnerRId, third: thirdRId } = getFinalists(bracket);
      const champOwner = champRId != null ? rosterOwner.get(champRId) : null;
      const runnerOwner = runnerRId != null ? rosterOwner.get(runnerRId) : null;
      const thirdOwner = thirdRId != null ? rosterOwner.get(thirdRId) : null;
      const playoffSpots = league.settings.playoff_teams ?? Math.floor(rosters.length / 2);
      const sorted = sortRosters(rosters);

      for (const roster of rosters) {
        const ownerId = rosterOwner.get(roster.roster_id);
        if (!ownerId) continue;
        if (!career.has(ownerId)) career.set(ownerId, mkCareer(ownerId));
        const c = career.get(ownerId)!;
        const rank = sorted.findIndex(r => r.roster_id === roster.roster_id) + 1;

        c.wins += roster.settings.wins ?? 0;
        c.losses += roster.settings.losses ?? 0;
        c.ties += roster.settings.ties ?? 0;
        c.pf += pfVal(roster);
        if (ownerId === champOwner) c.championships++;
        if (ownerId === runnerOwner) c.runnerUp++;
        if (ownerId === thirdOwner) c.thirdPlace++;
        if (rank <= playoffSpots) c.playoffApps++;
        c.seasons++;
        if (league.season < c.firstSeason) c.firstSeason = league.season;
        if (league.season > c.lastSeason) c.lastSeason = league.season;
      }
    }

    const rows = [...career.values()]
      .filter(c => c.seasons > 0)
      .sort((a, b) => {
        const cd = b.championships - a.championships;
        if (cd !== 0) return cd;
        return (b.wins / (b.wins + b.losses || 1)) - (a.wins / (a.wins + a.losses || 1));
      });

    const seasons = [...history].sort((a, b) => Number(b.league.season) - Number(a.league.season));
    const mostChamps = rows[0];
    const bestWinRate = [...rows].sort((a, b) =>
      (b.wins / (b.wins + b.losses || 1)) - (a.wins / (a.wins + a.losses || 1))
    )[0];
    const mostPF = [...rows].sort((a, b) => b.pf - a.pf)[0];

    return { latestUserMap, allUserIds, userColorMap, career, rows, seasons, mostChamps, bestWinRate, mostPF };
  }, [history]);

  const h2h = useMemo(() => {
    type H2HRecord = { wins: number; losses: number };
    const result = new Map<string, Map<string, H2HRecord>>();
    if (!allTimeMatchups || !history?.length) return result;

    for (const { league, rosters } of history) {
      const weekMap = allTimeMatchups[league.season];
      if (!weekMap) continue;
      const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

      for (const weekMatchups of Object.values(weekMap)) {
        const pairs = new Map<number, SleeperMatchup[]>();
        for (const m of weekMatchups) {
          const arr = pairs.get(m.matchup_id) ?? [];
          arr.push(m);
          pairs.set(m.matchup_id, arr);
        }
        for (const pair of pairs.values()) {
          if (pair.length !== 2) continue;
          const [a, b] = pair;
          if (a.points === 0 && b.points === 0) continue;
          const aOwner = rosterOwner.get(a.roster_id);
          const bOwner = rosterOwner.get(b.roster_id);
          if (!aOwner || !bOwner || aOwner === bOwner) continue;
          const aWins = a.points > b.points;

          if (!result.has(aOwner)) result.set(aOwner, new Map());
          const aMap = result.get(aOwner)!;
          const aRec = aMap.get(bOwner) ?? { wins: 0, losses: 0 };
          aRec.wins += aWins ? 1 : 0; aRec.losses += aWins ? 0 : 1;
          aMap.set(bOwner, aRec);

          if (!result.has(bOwner)) result.set(bOwner, new Map());
          const bMap = result.get(bOwner)!;
          const bRec = bMap.get(aOwner) ?? { wins: 0, losses: 0 };
          bRec.wins += aWins ? 0 : 1; bRec.losses += aWins ? 1 : 0;
          bMap.set(aOwner, bRec);
        }
      }
    }
    return result;
  }, [allTimeMatchups, history]);

  const records = useMemo((): RecordEntry[] => {
    if (!allTimeMatchups || !history?.length || !derived) return [];
    const { rows, latestUserMap } = derived;
    const entries: RecordEntry[] = [];

    const name = (uid: string) => {
      const u = latestUserMap.get(uid);
      return u?.display_name ?? u?.username ?? uid;
    };

    let highScore = { score: 0, owner: '', season: '', week: 0 };
    let biggestBlowout = { margin: 0, winOwner: '', loseOwner: '', season: '', week: 0 };
    const maxSeasonPF = new Map<string, number>();

    for (const { league, rosters } of history) {
      const weekMap = allTimeMatchups[league.season];
      if (!weekMap) continue;
      const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

      for (const roster of rosters) {
        const ownerId = rosterOwner.get(roster.roster_id);
        if (!ownerId) continue;
        const pts = pfVal(roster);
        if (pts > (maxSeasonPF.get(ownerId) ?? 0)) maxSeasonPF.set(ownerId, pts);
      }

      for (const [weekStr, weekMatchups] of Object.entries(weekMap)) {
        const week = Number(weekStr);
        const pairs = new Map<number, SleeperMatchup[]>();
        for (const m of weekMatchups) {
          const arr = pairs.get(m.matchup_id) ?? [];
          arr.push(m);
          pairs.set(m.matchup_id, arr);
          if (m.points > highScore.score) {
            highScore = { score: m.points, owner: rosterOwner.get(m.roster_id) ?? '', season: league.season, week };
          }
        }
        for (const pair of pairs.values()) {
          if (pair.length !== 2) continue;
          const [a, b] = pair;
          if (a.points === 0 && b.points === 0) continue;
          const margin = Math.abs(a.points - b.points);
          if (margin > biggestBlowout.margin) {
            const winner = a.points > b.points ? a : b;
            const loser = a.points > b.points ? b : a;
            biggestBlowout = {
              margin, season: league.season, week,
              winOwner: rosterOwner.get(winner.roster_id) ?? '',
              loseOwner: rosterOwner.get(loser.roster_id) ?? '',
            };
          }
        }
      }
    }

    if (highScore.score > 0) entries.push({
      icon: 'bolt', label: 'Highest Single Week',
      value: highScore.score.toFixed(2),
      detail: `${name(highScore.owner)} · ${highScore.season} Wk${highScore.week}`,
    });

    const bestSeasonOwner = [...maxSeasonPF.entries()].sort((a, b) => b[1] - a[1])[0];
    if (bestSeasonOwner && bestSeasonOwner[1] > 0) entries.push({
      icon: 'star', label: 'Most Points in a Season',
      value: bestSeasonOwner[1].toFixed(2),
      detail: name(bestSeasonOwner[0]),
    });

    if (biggestBlowout.margin > 0) entries.push({
      icon: 'flame', label: 'Biggest Blowout',
      value: `+${biggestBlowout.margin.toFixed(2)}`,
      detail: `${name(biggestBlowout.winOwner)} def. ${name(biggestBlowout.loseOwner)} · ${biggestBlowout.season} Wk${biggestBlowout.week}`,
    });

    const mostWins = [...rows].sort((a, b) => b.wins - a.wins)[0];
    if (mostWins) entries.push({
      icon: 'trophy', label: 'Most Career Wins',
      value: `${mostWins.wins}`,
      detail: `${name(mostWins.userId)} · ${mostWins.losses} losses`,
    });

    if (derived.mostChamps?.championships > 1) entries.push({
      icon: 'crown', label: 'Most Championships',
      value: `${derived.mostChamps.championships}×`,
      detail: name(derived.mostChamps.userId),
    });

    const mostSeasons = [...rows].sort((a, b) => b.seasons - a.seasons)[0];
    if (mostSeasons) entries.push({
      icon: 'clock', label: 'Most Seasons Played',
      value: `${mostSeasons.seasons}`,
      detail: name(mostSeasons.userId),
    });

    const qualBest = rows.filter(r => r.seasons >= 2)[0];
    if (qualBest) entries.push({
      icon: 'percentage', label: 'Best Win Rate (2+ seasons)',
      value: `${(qualBest.wins / (qualBest.wins + qualBest.losses || 1) * 100).toFixed(1)}%`,
      detail: name(qualBest.userId),
    });

    const mostCareerPF = [...rows].sort((a, b) => b.pf - a.pf)[0];
    if (mostCareerPF) entries.push({
      icon: 'chart-bar', label: 'Most Career Points',
      value: mostCareerPF.pf.toFixed(0),
      detail: name(mostCareerPF.userId),
    });

    return entries;
  }, [allTimeMatchups, history, derived]);

  // ── Now safe to early-return ──
  if (isLoading) return <div className="loading">Loading league history…</div>;
  if (!history?.length || !derived) return (
    <div className="snap-empty">
      <i className="ti ti-history" style={{ fontSize: 32, opacity: 0.3 }} />
      <p>No history available. Link previous seasons in Sleeper to unlock all-time stats.</p>
    </div>
  );

  const { latestUserMap, allUserIds, userColorMap, career, rows, seasons, mostChamps, bestWinRate, mostPF } = derived;

  const userName = (uid: string) => {
    const u = latestUserMap.get(uid);
    return u?.display_name ?? u?.username ?? uid;
  };

  const effectiveTarget = versusTarget || userId || rows[0]?.userId || '';

  return (
    <div className="ath-wrap">
      {/* ── Stats strip ── */}
      <div className="ath-strip">
        <div className="ath-strip-stat">
          <div className="ath-strip-val">{history.length}</div>
          <div className="ath-strip-lbl">Seasons</div>
        </div>
        <div className="ath-strip-divider" />
        <div className="ath-strip-stat">
          <div className="ath-strip-val">{allUserIds.length}</div>
          <div className="ath-strip-lbl">Managers</div>
        </div>
        {mostChamps && (
          <>
            <div className="ath-strip-divider" />
            <div className="ath-strip-stat">
              <div className="ath-strip-val">{mostChamps.championships}×</div>
              <div className="ath-strip-lbl">Most Titles · {userName(mostChamps.userId)}</div>
            </div>
          </>
        )}
        {bestWinRate && (
          <>
            <div className="ath-strip-divider" />
            <div className="ath-strip-stat">
              <div className="ath-strip-val">
                {(bestWinRate.wins / (bestWinRate.wins + bestWinRate.losses || 1) * 100).toFixed(1)}%
              </div>
              <div className="ath-strip-lbl">Best Win% · {userName(bestWinRate.userId)}</div>
            </div>
          </>
        )}
        {mostPF && (
          <>
            <div className="ath-strip-divider" />
            <div className="ath-strip-stat">
              <div className="ath-strip-val">{mostPF.pf.toFixed(0)}</div>
              <div className="ath-strip-lbl">Most Career Pts · {userName(mostPF.userId)}</div>
            </div>
          </>
        )}
      </div>

      {/* ── Internal tabs ── */}
      <div className="ath-tabs">
        {(['standings', 'seasons', 'versus', 'records'] as View[]).map(v => (
          <button key={v} className={`ath-tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
            {v === 'standings' ? 'All-Time Standings'
              : v === 'seasons' ? 'Season History'
              : v === 'versus' ? 'Versus'
              : 'Record Book'}
          </button>
        ))}
      </div>

      {/* ── All-Time Standings ── */}
      {view === 'standings' && (
        <div className="table-scroll">
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Manager</th>
                <th>Seasons</th>
                <th>Record</th>
                <th>Win %</th>
                <th>Points For</th>
                <th>Titles</th>
                <th>Playoffs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const user = latestUserMap.get(c.userId);
                const av = user ? avatarUrl(user.avatar) : null;
                const winPct = (c.wins / (c.wins + c.losses || 1) * 100).toFixed(1);
                const isMe = c.userId === userId;
                const color = userColorMap.get(c.userId) ?? '#6b7280';
                const displayName = user?.display_name ?? user?.username ?? c.userId;
                return (
                  <tr key={c.userId} className={isMe ? 'ath-me-row' : ''}>
                    <td className="rank">{i + 1}</td>
                    <td>
                      <div className="team-cell">
                        {av
                          ? <img loading="lazy" src={av} alt="" className="avatar-xs" />
                          : <div className="ath-av-init" style={{ background: color + '22', color }}>{initials(displayName)}</div>
                        }
                        <span>{displayName}</span>
                        {isMe && <span className="ath-you">You</span>}
                      </div>
                    </td>
                    <td className="ath-muted">
                      {c.firstSeason === c.lastSeason ? c.firstSeason : `${c.firstSeason}–${c.lastSeason}`} ({c.seasons})
                    </td>
                    <td>{c.wins}–{c.losses}{c.ties > 0 ? `–${c.ties}` : ''}</td>
                    <td className="ath-bold">{winPct}%</td>
                    <td className="ath-bold">{c.pf.toFixed(0)}</td>
                    <td>
                      <div className="ath-trophies">
                        {c.championships > 0 && <span className="ath-trophy-pill gold"><i className="ti ti-trophy" /> {c.championships}</span>}
                        {c.runnerUp > 0 && <span className="ath-trophy-pill silver"><i className="ti ti-medal" /> {c.runnerUp}</span>}
                        {c.thirdPlace > 0 && <span className="ath-trophy-pill bronze"><i className="ti ti-medal-2" /> {c.thirdPlace}</span>}
                        {!c.championships && !c.runnerUp && !c.thirdPlace && '—'}
                      </div>
                    </td>
                    <td>{c.playoffApps}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Season History ── */}
      {view === 'seasons' && (
        <div className="table-scroll">
          <table className="standings-table">
            <thead>
              <tr>
                <th>Season</th>
                <th><i className="ti ti-trophy" /> Champion</th>
                <th><i className="ti ti-medal" /> Runner-up</th>
                <th><i className="ti ti-medal-2" /> 3rd Place</th>
                <th>Reg. Season #1</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map(({ league, rosters, bracket }) => {
                const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));
                const { first: champRId, second: runnerRId, third: thirdRId } = getFinalists(bracket);
                const champUid = champRId != null ? rosterOwner.get(champRId) : null;
                const runnerUid = runnerRId != null ? rosterOwner.get(runnerRId) : null;
                const thirdUid = thirdRId != null ? rosterOwner.get(thirdRId) : null;
                const sorted = sortRosters(rosters);
                const regWinnerUid = rosterOwner.get(sorted[0]?.roster_id);
                const champ = champUid ? latestUserMap.get(champUid) : null;
                const runner = runnerUid ? latestUserMap.get(runnerUid) : null;
                const third = thirdUid ? latestUserMap.get(thirdUid) : null;
                const regWinner = regWinnerUid ? latestUserMap.get(regWinnerUid) : null;
                return (
                  <tr key={league.season} className={champUid === userId ? 'ath-me-row' : ''}>
                    <td><span className="ath-season-badge">{league.season}</span></td>
                    <td>
                      <div className="team-cell">
                        <span className="ath-season-champ-icon">🏆</span>
                        <span className="ath-bold">{champ?.display_name ?? champ?.username ?? '—'}</span>
                      </div>
                    </td>
                    <td className="ath-muted">{runner?.display_name ?? runner?.username ?? '—'}</td>
                    <td className="ath-muted">{third?.display_name ?? third?.username ?? '—'}</td>
                    <td className="ath-muted">{regWinner?.display_name ?? regWinner?.username ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Versus ── */}
      {view === 'versus' && (
        <div className="ath-versus">
          <div className="ath-versus-picker">
            <label className="ath-versus-label">View record for</label>
            <select className="week-select" value={effectiveTarget} onChange={e => setVersusTarget(e.target.value)}>
              {rows.map(r => (
                <option key={r.userId} value={r.userId}>
                  {userName(r.userId)}{r.userId === userId ? ' (You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {allTimeLoading ? (
            <div className="loading">Loading matchup data…</div>
          ) : !allTimeMatchups ? (
            <div className="snap-empty">
              <p>Matchup data is loading. Try switching to Record Book tab to trigger the load.</p>
            </div>
          ) : (() => {
            const targetMap = h2h.get(effectiveTarget);
            const opponents = rows.filter(r => r.userId !== effectiveTarget);
            const targetCareer = career.get(effectiveTarget);
            const totalW = targetMap ? [...targetMap.values()].reduce((s, r) => s + r.wins, 0) : 0;
            const totalL = targetMap ? [...targetMap.values()].reduce((s, r) => s + r.losses, 0) : 0;
            const u = latestUserMap.get(effectiveTarget);
            const av = u ? avatarUrl(u.avatar) : null;
            const color = userColorMap.get(effectiveTarget) ?? '#6b7280';
            const tName = u?.display_name ?? u?.username ?? effectiveTarget;
            return (
              <>
                <div className="ath-versus-summary">
                  <div className="ath-versus-av-wrap">
                    {av
                      ? <img src={av} alt="" className="ath-versus-av" />
                      : <div className="ath-versus-av ath-versus-av-init" style={{ background: color + '22', color }}>{initials(tName)}</div>
                    }
                  </div>
                  <div className="ath-versus-name">{tName}</div>
                  <div className="ath-versus-record">{totalW}–{totalL}</div>
                  <div className="ath-versus-record-lbl">All-time H2H record</div>
                  {targetCareer && (
                    <div className="ath-versus-meta">
                      {targetCareer.seasons} seasons · {targetCareer.championships} titles · {targetCareer.pf.toFixed(0)} career pts
                    </div>
                  )}
                </div>
                <div className="table-scroll">
                  <table className="standings-table">
                    <thead>
                      <tr><th>Opponent</th><th>W</th><th>L</th><th>Win %</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                      {opponents.map(opp => {
                        const rec = targetMap?.get(opp.userId) ?? { wins: 0, losses: 0 };
                        const total = rec.wins + rec.losses;
                        const wp = total > 0 ? `${(rec.wins / total * 100).toFixed(0)}%` : '—';
                        const ou = latestUserMap.get(opp.userId);
                        const oav = ou ? avatarUrl(ou.avatar) : null;
                        const ocolor = userColorMap.get(opp.userId) ?? '#6b7280';
                        const oname = ou?.display_name ?? ou?.username ?? opp.userId;
                        const dominant = total > 0 && rec.wins / total > 0.6;
                        const behind = total > 0 && rec.losses / total > 0.6;
                        return (
                          <tr key={opp.userId}>
                            <td>
                              <div className="team-cell">
                                {oav
                                  ? <img loading="lazy" src={oav} alt="" className="avatar-xs" />
                                  : <div className="ath-av-init" style={{ background: ocolor + '22', color: ocolor }}>{initials(oname)}</div>
                                }
                                <span>{oname}</span>
                              </div>
                            </td>
                            <td className="ath-bold" style={{ color: 'var(--green)' }}>{rec.wins}</td>
                            <td className="ath-bold" style={{ color: 'var(--red)' }}>{rec.losses}</td>
                            <td>{wp}</td>
                            <td>
                              {total === 0
                                ? <span className="ath-muted">No matchups</span>
                                : dominant ? <span className="ath-pill green">Dominant</span>
                                : behind ? <span className="ath-pill red">Trailing</span>
                                : <span className="ath-pill neutral">Even</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Record Book ── */}
      {view === 'records' && (
        <div className="ath-records">
          {allTimeLoading ? (
            <div className="loading">Crunching all-time matchup data…</div>
          ) : !allTimeMatchups ? (
            <div className="snap-empty">
              <i className="ti ti-database" style={{ fontSize: 32, opacity: 0.3 }} />
              <p>Record book data is loading.</p>
            </div>
          ) : records.length === 0 ? (
            <div className="snap-empty">No records found.</div>
          ) : (
            <div className="ath-records-grid">
              {records.map((rec, i) => (
                <div key={i} className="ath-record-card">
                  <div className="ath-record-icon"><i className={`ti ti-${rec.icon}`} /></div>
                  <div className="ath-record-body">
                    <div className="ath-record-label">{rec.label}</div>
                    <div className="ath-record-val">{rec.value}</div>
                    <div className="ath-record-detail">{rec.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
