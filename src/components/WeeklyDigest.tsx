import { useState } from 'react';
import type { SleeperMatchup, SleeperRoster, SleeperUser, SleeperTransaction, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  seasonTransactions: Record<number, SleeperTransaction[]> | undefined;
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players: PlayersMap | undefined;
  currentWeek: number;
  userId?: string;
  isLoading: boolean;
}

function fmt(n: number) { return n.toFixed(1); }

function rosterUser(rosterId: number, rosters: SleeperRoster[], userMap: Map<string, SleeperUser>) {
  const r = rosters.find(x => x.roster_id === rosterId);
  const u = r ? userMap.get(r.owner_id) : undefined;
  return { user: u, roster: r };
}

export default function WeeklyDigest({
  seasonMatchups, seasonTransactions, rosters, userMap, players, currentWeek, userId, isLoading,
}: Props) {
  const weeks = seasonMatchups ? Object.keys(seasonMatchups).map(Number).filter(w => {
    const entries = seasonMatchups[w] ?? [];
    return entries.some(e => e.points > 0);
  }).sort((a, b) => b - a) : [];

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const week = selectedWeek ?? weeks[0] ?? currentWeek;

  if (isLoading) return <div className="loading">Loading digest…</div>;
  if (!seasonMatchups || weeks.length === 0) return <div className="empty">No completed weeks yet.</div>;

  const entries = seasonMatchups[week] ?? [];
  const pairs = new Map<number, SleeperMatchup[]>();
  for (const e of entries) {
    const g = pairs.get(e.matchup_id) ?? [];
    g.push(e);
    pairs.set(e.matchup_id, g);
  }

  const myRoster = userId ? rosters.find(r => r.owner_id === userId) : rosters[0];
  const myEntry = myRoster ? entries.find(e => e.roster_id === myRoster.roster_id) : undefined;
  const myOpp = myEntry ? entries.find(e => e.matchup_id === myEntry.matchup_id && e.roster_id !== myEntry.roster_id) : undefined;

  // Season avg for my team up to this week
  const myPriorWeeks = weeks.filter(w => w < week);
  const myAvg = myPriorWeeks.length > 0
    ? myPriorWeeks.reduce((s, w) => {
        const e = (seasonMatchups[w] ?? []).find(e => e.roster_id === myRoster?.roster_id);
        return s + (e?.points ?? 0);
      }, 0) / myPriorWeeks.length
    : null;

  // Best/worst starter for my team
  let bestPlayer: { name: string; pts: number } | null = null;
  let worstPlayer: { name: string; pts: number } | null = null;
  if (myEntry?.starters && myEntry.starters_points && players) {
    const starterPairs = myEntry.starters.map((id, i) => ({
      name: players[id]?.full_name ?? id,
      pts: myEntry.starters_points[i] ?? 0,
    })).filter(p => p.name !== 'Empty');
    if (starterPairs.length) {
      bestPlayer = starterPairs.reduce((a, b) => b.pts > a.pts ? b : a);
      worstPlayer = starterPairs.reduce((a, b) => b.pts < a.pts ? b : a);
    }
  }

  // Best bench player left on the table
  let bestBench: { name: string; pts: number } | null = null;
  if (myEntry?.players_points && myEntry.starters && players) {
    const starterSet = new Set(myEntry.starters);
    const benchEntries = Object.entries(myEntry.players_points)
      .filter(([id]) => !starterSet.has(id))
      .map(([id, pts]) => ({ name: players[id]?.full_name ?? id, pts }));
    if (benchEntries.length) bestBench = benchEntries.reduce((a, b) => b.pts > a.pts ? b : a);
  }

  // All scores this week for context
  const allScores = entries.map(e => e.points).filter(p => p > 0).sort((a, b) => b - a);
  const leagueAvg = allScores.length ? allScores.reduce((s, p) => s + p, 0) / allScores.length : 0;
  const myRank = myEntry ? allScores.indexOf(myEntry.points) + 1 : null;

  // Transactions this week
  const weekTx = (seasonTransactions?.[week] ?? []);
  const waiverAdds = weekTx.filter(t => t.type === 'waiver' || t.type === 'free_agent');
  const myWaiverAdds = waiverAdds.filter(t => myRoster && t.roster_ids.includes(myRoster.roster_id));

  const myUser = myRoster ? userMap.get(myRoster.owner_id) : undefined;
  const oppUser = myOpp ? rosterUser(myOpp.roster_id, rosters, userMap).user : undefined;

  const won = myEntry && myOpp ? myEntry.points > myOpp.points : false;
  const margin = myEntry && myOpp ? Math.abs(myEntry.points - myOpp.points) : 0;

  return (
    <div className="digest-wrap">
      {/* Week selector */}
      <div className="digest-week-row">
        <select
          className="week-select"
          value={week}
          onChange={e => setSelectedWeek(Number(e.target.value))}
        >
          {weeks.map(w => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
      </div>

      {/* My result hero card */}
      {myEntry && myOpp ? (
        <div className={`digest-hero ${won ? 'digest-win' : 'digest-loss'}`}>
          <div className="digest-hero-label">{won ? 'Victory' : 'Defeat'} · Week {week}</div>
          <div className="digest-hero-matchup">
            <div className="digest-hero-team">
              {myUser?.avatar
                ? <img src={avatarUrl(myUser.avatar)!} alt="" className="avatar-sm" />
                : <div className="avatar-sm avatar-placeholder" />}
              <span className="digest-hero-name">{myUser?.display_name ?? 'My Team'}</span>
              <span className="digest-hero-score">{fmt(myEntry.points)}</span>
            </div>
            <span className="digest-hero-vs">vs</span>
            <div className="digest-hero-team digest-hero-opp">
              {oppUser?.avatar
                ? <img src={avatarUrl(oppUser.avatar)!} alt="" className="avatar-sm" />
                : <div className="avatar-sm avatar-placeholder" />}
              <span className="digest-hero-name">{oppUser?.display_name ?? 'Opponent'}</span>
              <span className="digest-hero-score digest-opp-score">{fmt(myOpp.points)}</span>
            </div>
          </div>
          <div className="digest-hero-meta">
            {won ? `Won by ${fmt(margin)}` : `Lost by ${fmt(margin)}`}
            {margin < 5 && <span className="digest-nail"> · Nail-biter!</span>}
            {margin > 40 && <span className="digest-nail"> · Blowout</span>}
          </div>
        </div>
      ) : (
        <div className="digest-hero digest-no-match">
          <div className="digest-hero-label">Week {week}</div>
          <div className="digest-hero-meta">No matchup found for your team.</div>
        </div>
      )}

      {/* Stat pills */}
      <div className="digest-stats">
        {myEntry && (
          <div className="digest-stat-card">
            <span className="digest-stat-val">{fmt(myEntry.points)}</span>
            <span className="digest-stat-lbl">Your score</span>
          </div>
        )}
        {myAvg !== null && (
          <div className="digest-stat-card">
            <span className={`digest-stat-val ${myEntry && myEntry.points >= myAvg ? 'ds-up' : 'ds-down'}`}>
              {myEntry && myEntry.points >= myAvg ? '+' : ''}{myEntry ? fmt(myEntry.points - myAvg) : '—'}
            </span>
            <span className="digest-stat-lbl">vs season avg</span>
          </div>
        )}
        {myRank !== null && (
          <div className="digest-stat-card">
            <span className="digest-stat-val">#{myRank}</span>
            <span className="digest-stat-lbl">of {allScores.length} teams</span>
          </div>
        )}
        <div className="digest-stat-card">
          <span className="digest-stat-val">{fmt(leagueAvg)}</span>
          <span className="digest-stat-lbl">League avg</span>
        </div>
      </div>

      {/* Player highlights */}
      {(bestPlayer || worstPlayer || bestBench) && (
        <div className="digest-section">
          <div className="digest-section-title">Player Highlights</div>
          {bestPlayer && (
            <div className="digest-highlight-row dh-good">
              <span className="dh-icon">🔥</span>
              <div className="dh-info">
                <span className="dh-label">Top performer</span>
                <span className="dh-name">{bestPlayer.name}</span>
              </div>
              <span className="dh-pts">{fmt(bestPlayer.pts)} pts</span>
            </div>
          )}
          {worstPlayer && (
            <div className="digest-highlight-row dh-bad">
              <span className="dh-icon">💀</span>
              <div className="dh-info">
                <span className="dh-label">Biggest letdown</span>
                <span className="dh-name">{worstPlayer.name}</span>
              </div>
              <span className="dh-pts">{fmt(worstPlayer.pts)} pts</span>
            </div>
          )}
          {bestBench && (
            <div className="digest-highlight-row dh-neutral">
              <span className="dh-icon">😬</span>
              <div className="dh-info">
                <span className="dh-label">Left on bench</span>
                <span className="dh-name">{bestBench.name}</span>
              </div>
              <span className="dh-pts">{fmt(bestBench.pts)} pts</span>
            </div>
          )}
        </div>
      )}

      {/* My waiver moves this week */}
      {myWaiverAdds.length > 0 && players && (
        <div className="digest-section">
          <div className="digest-section-title">Your Moves This Week</div>
          {myWaiverAdds.slice(0, 4).map(tx => {
            const added = Object.keys(tx.adds ?? {});
            const dropped = Object.keys(tx.drops ?? {});
            return (
              <div key={tx.transaction_id} className="digest-tx-row">
                <span className="digest-tx-type">{tx.type === 'waiver' ? 'W' : 'FA'}</span>
                <div className="digest-tx-info">
                  {added.map(id => (
                    <span key={id} className="digest-tx-add">+ {players[id]?.full_name ?? id}</span>
                  ))}
                  {dropped.map(id => (
                    <span key={id} className="digest-tx-drop">− {players[id]?.full_name ?? id}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All scores this week */}
      <div className="digest-section">
        <div className="digest-section-title">All Scores · Week {week}</div>
        {allScores.map((score, i) => {
          const entry = entries.find(e => e.points === score);
          if (!entry) return null;
          const { user } = rosterUser(entry.roster_id, rosters, userMap);
          const isMe = entry.roster_id === myRoster?.roster_id;
          return (
            <div key={entry.roster_id} className={`digest-score-row ${isMe ? 'digest-score-me' : ''}`}>
              <span className="digest-score-rank">#{i + 1}</span>
              {user?.avatar
                ? <img loading="lazy" src={avatarUrl(user.avatar)!} alt="" className="avatar-xs" />
                : <div className="avatar-xs avatar-placeholder" />}
              <span className="digest-score-name">{user?.display_name ?? `Team ${entry.roster_id}`}</span>
              <span className="digest-score-pts">{fmt(score)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
