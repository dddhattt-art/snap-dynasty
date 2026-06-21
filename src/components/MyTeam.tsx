import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SleeperRoster, SleeperUser, SleeperMatchup, SleeperTransaction, SleeperLeague, PlayersMap } from '../types/sleeper';
import { avatarUrl, getEspnNflNews } from '../api/sleeper';
import PlayerAvatar from './PlayerAvatar';
import PlayerPanel from './PlayerPanel';
import type { EspnArticle } from '../api/sleeper';
import type { SalaryMap } from '../hooks/useSalaries';

interface Props {
  userId?: string;
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players?: PlayersMap;
  seasonMatchups?: Record<number, SleeperMatchup[]>;
  seasonTransactions?: Record<number, SleeperTransaction[]>;
  league?: SleeperLeague;
  isLoading: boolean;
  salaries?: SalaryMap;
  setSalary?: (playerId: string, amount: number) => void;
  cap?: number;
  setCap?: (amount: number) => void;
}

const POS_COLOR: Record<string, string> = {
  QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a',
  K: '#6b1c6b', DEF: '#444',
};

function posColor(pos: string) { return POS_COLOR[pos] ?? '#888'; }

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`myteam-stat ${highlight ? 'myteam-stat-hl' : ''}`}>
      <div className="myteam-stat-value">{value}</div>
      <div className="myteam-stat-label">{label}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MyTeam({ userId, rosters, userMap, players, seasonMatchups, seasonTransactions, league, isLoading, salaries, setSalary, cap, setCap }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [editingCap, setEditingCap] = useState(false);
  const [capInput, setCapInput] = useState('');
  const { data: espnNews } = useQuery({
    queryKey: ['espn-nfl-news'],
    queryFn: () => getEspnNflNews(),
    staleTime: 15 * 60 * 1000,
  });

  if (!userId) return <div className="empty">Sign in to see your team card.</div>;
  if (isLoading) return <div className="loading">Loading your team…</div>;

  const myRoster = rosters.find(r => r.owner_id === userId);
  if (!myRoster) return <div className="empty">You're not in this league.</div>;

  const me = userMap.get(userId);
  const av = me ? avatarUrl(me.avatar) : null;

  const wins = myRoster.settings.wins ?? 0;
  const losses = myRoster.settings.losses ?? 0;
  const pf = (myRoster.settings.fpts ?? 0) + (myRoster.settings.fpts_decimal ?? 0) / 100;
  const pa = (myRoster.settings.fpts_against ?? 0) + (myRoster.settings.fpts_against_decimal ?? 0) / 100;
  const streak = myRoster.settings.streak ?? 0;

  // Standing among all rosters
  const sorted = [...rosters].sort((a, b) => {
    const wd = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
    const pfa = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100;
    const pfb = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100;
    return wd !== 0 ? wd : pfb - pfa;
  });
  const standing = sorted.findIndex(r => r.roster_id === myRoster.roster_id) + 1;
  const playoffSpots = league?.settings.playoff_teams ?? Math.floor(rosters.length / 2);
  const inPlayoffs = standing <= playoffSpots;

  // Current week matchup
  const currentWeek = league?.settings?.leg ?? 1;
  const currentMatchups = seasonMatchups?.[currentWeek] ?? [];
  const myMatchup = currentMatchups.find(m => m.roster_id === myRoster.roster_id);
  const oppMatchup = myMatchup
    ? currentMatchups.find(m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myRoster.roster_id)
    : undefined;
  const oppRoster = oppMatchup ? rosters.find(r => r.roster_id === oppMatchup.roster_id) : undefined;
  const oppUser = oppRoster ? userMap.get(oppRoster.owner_id) : undefined;
  const oppAv = oppUser ? avatarUrl(oppUser.avatar) : null;

  // Starters this week
  const starters = myMatchup?.starters ?? myRoster.starters ?? [];
  const starterPts = myMatchup?.players_points ?? {};

  // Recent transactions (last 5 involving my roster)
  const recentTx: SleeperTransaction[] = [];
  if (seasonTransactions) {
    const allTx = Object.values(seasonTransactions).flat();
    for (const tx of allTx.sort((a, b) => b.created - a.created)) {
      if (tx.roster_ids.includes(myRoster.roster_id)) {
        recentTx.push(tx);
        if (recentTx.length >= 5) break;
      }
    }
  }

  const streakLabel = streak > 0 ? `W${Math.abs(streak)}` : streak < 0 ? `L${Math.abs(streak)}` : '—';

  // Season-long position rank — accumulate points across all weeks, rank within position
  const positionRank = new Map<string, number>(); // pid -> rank at position
  if (players && seasonMatchups) {
    const seasonTotals = new Map<string, { pts: number; pos: string }>();
    for (const weekMatchups of Object.values(seasonMatchups)) {
      for (const m of weekMatchups) {
        for (const [pid, pts] of Object.entries(m.players_points ?? {})) {
          const pos = players[pid]?.position;
          if (!pos) continue;
          const existing = seasonTotals.get(pid);
          if (existing) existing.pts += pts as number;
          else seasonTotals.set(pid, { pts: pts as number, pos });
        }
      }
    }
    const byPos = new Map<string, { pid: string; pts: number }[]>();
    for (const [pid, { pts, pos }] of seasonTotals) {
      if (!byPos.has(pos)) byPos.set(pos, []);
      byPos.get(pos)!.push({ pid, pts });
    }
    for (const group of byPos.values()) {
      group.sort((a, b) => b.pts - a.pts);
      group.forEach(({ pid }, i) => positionRank.set(pid, i + 1));
    }
  }

  // Bench players and optimal swap detection
  const starterSet = new Set(starters);
  const benchPids = (myRoster.players ?? []).filter(pid => !starterSet.has(pid));
  const suboptimalStarters = new Set<string>(); // starter pids outscored by a bench player same position
  for (const starterId of starters) {
    const starterPos = players?.[starterId]?.position;
    const starterScore = starterPts[starterId] ?? 0;
    const beaten = benchPids.some(benchId =>
      players?.[benchId]?.position === starterPos && (starterPts[benchId] ?? 0) > starterScore
    );
    if (beaten) suboptimalStarters.add(starterId);
  }
  const starterTotal = starters.reduce((sum, pid) => sum + (starterPts[pid] ?? 0), 0);

  // ESPN news for my players — match by espn_id first, fall back to name
  const myPids = new Set(myRoster.players ?? []);
  const espnById = new Map<number, EspnArticle[]>();
  const espnByName = new Map<string, EspnArticle[]>();
  for (const article of espnNews ?? []) {
    for (const id of article.athleteIds) {
      if (!espnById.has(id)) espnById.set(id, []);
      espnById.get(id)!.push(article);
    }
    for (const name of article.athleteNames) {
      if (!espnByName.has(name)) espnByName.set(name, []);
      espnByName.get(name)!.push(article);
    }
  }
  const myNews: { pid: string; headline: string; description: string; published: string; link: string }[] = [];
  const seenArticleLinks = new Set<string>();
  for (const pid of myPids) {
    const p = players?.[pid];
    if (!p) continue;
    const byId = p.espn_id ? (espnById.get(p.espn_id) ?? []) : [];
    const byName = p.full_name ? (espnByName.get(p.full_name.toLowerCase()) ?? []) : [];
    const articles = byId.length ? byId : byName;
    for (const article of articles) {
      if (!seenArticleLinks.has(article.link)) {
        seenArticleLinks.add(article.link);
        myNews.push({ pid, ...article });
      }
    }
  }
  myNews.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());


  return (
    <div className="myteam-wrap">
      <PlayerPanel playerId={selectedPlayerId} players={players} onClose={() => setSelectedPlayerId(null)} salaries={salaries} setSalary={setSalary} />

      {/* Header card */}
      <div className="myteam-header">
        <div className="myteam-identity">
          {av && <img loading="lazy" src={av} alt="" className="myteam-avatar" />}
          <div>
            <div className="myteam-name">{me?.display_name ?? me?.username ?? 'Your Team'}</div>
            <div className="myteam-league">{league?.name} · {league?.season}</div>
          </div>
        </div>
        <div className="myteam-record-block">
          <span className="myteam-record">{wins}–{losses}</span>
          <span className="myteam-standing">{standing}{ordinal(standing)} place</span>
          <span className="myteam-playoff-badge" style={{ background: inPlayoffs ? 'var(--green)' : 'var(--red)' }}>
            {inPlayoffs ? '✓ Playoff' : '✗ Out'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="myteam-stats">
        <StatPill label="Points For" value={pf.toFixed(1)} />
        <StatPill label="Points Against" value={pa.toFixed(1)} />
        <StatPill label="Streak" value={streakLabel} highlight={streak !== 0} />
        <StatPill label="Standing" value={`${standing} / ${rosters.length}`} />
      </div>

      {/* Salary cap bar */}
      {salaries && (() => {
        const allPids = myRoster.players ?? [];
        const totalSalary = allPids.reduce((sum, pid) => sum + (salaries[pid] ?? 0), 0);
        const hasCap = cap && cap > 0;
        const pct = hasCap ? Math.min(totalSalary / cap, 1) : 0;
        const overCap = hasCap && totalSalary > cap;
        const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

        return (
          <div className="cap-bar-wrap">
            <div className="cap-bar-header">
              <span className="cap-bar-label">Salary</span>
              <span className={`cap-bar-total ${overCap ? 'cap-over' : ''}`}>{fmtM(totalSalary)}</span>
              {hasCap && (
                <span className="cap-bar-of">of</span>
              )}
              {editingCap ? (
                <form className="cap-edit-form" onSubmit={e => {
                  e.preventDefault();
                  const val = parseFloat(capInput.replace(/[^0-9.]/g, '')) * 1_000_000;
                  if (!isNaN(val) && val > 0) setCap?.(val);
                  setEditingCap(false);
                }}>
                  <span className="cap-edit-dollar">$</span>
                  <input
                    className="cap-edit-input"
                    type="number"
                    min="1"
                    step="0.1"
                    autoFocus
                    placeholder="e.g. 279.2"
                    value={capInput}
                    onChange={e => setCapInput(e.target.value)}
                    onBlur={() => setEditingCap(false)}
                  />
                  <span className="cap-edit-unit">M</span>
                  <button type="submit" className="cap-edit-save">Set</button>
                </form>
              ) : (
                <button
                  className={`cap-set-btn ${hasCap ? 'cap-set-btn--active' : ''}`}
                  onClick={() => { setCapInput(hasCap ? String(cap / 1_000_000) : ''); setEditingCap(true); }}
                >
                  {hasCap ? fmtM(cap) : '+ Set Cap'}
                </button>
              )}
              {hasCap && (
                <span className={`cap-remaining ${overCap ? 'cap-over' : 'cap-under'}`}>
                  {overCap ? `${fmtM(totalSalary - cap)} over` : `${fmtM(cap - totalSalary)} remaining`}
                </span>
              )}
            </div>
            {hasCap && (
              <div className="cap-bar-track">
                <div
                  className={`cap-bar-fill ${overCap ? 'cap-bar-fill--over' : ''}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* Matchup — full lineup breakdown */}
      {myMatchup && players && (
        <div className="myteam-section">
          {/* Score header */}
          <div className="mu-header">
            <div className={`mu-team ${myMatchup.points >= (oppMatchup?.points ?? 0) ? 'mu-winning' : ''}`}>
              {av && <img loading="lazy" src={av} alt="" className="avatar-sm" />}
              <div>
                <div className="mu-team-name">{me?.display_name ?? 'You'}</div>
                <div className="mu-score">{myMatchup.points.toFixed(2)}</div>
              </div>
            </div>
            <div className="mu-vs-col">
              <span className="mu-wk">Wk {currentWeek}</span>
              <span className="mu-vs">vs</span>
            </div>
            <div className={`mu-team mu-team-right ${(oppMatchup?.points ?? 0) > myMatchup.points ? 'mu-winning' : ''}`}>
              <div>
                <div className="mu-team-name">{oppUser?.display_name ?? oppUser?.username ?? `Team ${oppMatchup?.roster_id}`}</div>
                <div className="mu-score">{oppMatchup?.points.toFixed(2) ?? '—'}</div>
              </div>
              {oppAv && <img loading="lazy" src={oppAv} alt="" className="avatar-sm" />}
            </div>
          </div>

          {/* Player-by-player rows */}
          <div className="mu-lineup">
            {starters.map((myPid, i) => {
              const oppPid = oppMatchup?.starters?.[i];
              const slot = (league?.roster_positions?.[i] ?? '').replace('DEF', 'DST');
              const myP = players[myPid];
              const oppP = oppPid ? players[oppPid] : undefined;
              const myPts = starterPts[myPid];
              const oppPts = oppPid ? (oppMatchup?.players_points?.[oppPid]) : undefined;
              const myWins = myPts !== undefined && oppPts !== undefined && myPts >= oppPts;
              const oppWins = myPts !== undefined && oppPts !== undefined && oppPts > myPts;
              const suboptimal = suboptimalStarters.has(myPid);
              return (
                <div key={myPid} className="mu-row">
                  {/* My player */}
                  <div className={`mu-player mu-player-left player-row-clickable ${myWins ? 'mu-player-win' : ''}`}
                    onClick={() => setSelectedPlayerId(myPid)}>
                    <PlayerAvatar playerId={myPid} position={myP?.position} team={myP?.team} size={36} />
                    <div className="mu-player-info">
                      <span className="mu-player-name">{myP?.last_name ?? myPid}{suboptimal ? ' ⚠' : ''}</span>
                      <span className="mu-player-team">{myP?.team ?? 'FA'}</span>
                    </div>
                    <span className={`mu-pts ${myWins ? 'mu-pts-win' : ''}`}>
                      {myPts !== undefined ? myPts.toFixed(1) : '—'}
                    </span>
                  </div>

                  {/* Slot label */}
                  <div className="mu-slot">{slot}</div>

                  {/* Opp player */}
                  {oppPid && oppP ? (
                    <div className={`mu-player mu-player-right player-row-clickable ${oppWins ? 'mu-player-win' : ''}`}
                      onClick={() => setSelectedPlayerId(oppPid)}>
                      <span className={`mu-pts ${oppWins ? 'mu-pts-win' : ''}`}>
                        {oppPts !== undefined ? oppPts.toFixed(1) : '—'}
                      </span>
                      <div className="mu-player-info mu-player-info-right">
                        <span className="mu-player-name">{oppP.last_name ?? oppPid}</span>
                        <span className="mu-player-team">{oppP.team ?? 'FA'}</span>
                      </div>
                      <PlayerAvatar playerId={oppPid} position={oppP.position} team={oppP.team} size={36} />
                    </div>
                  ) : (
                    <div className="mu-player mu-player-right mu-empty-slot">
                      <span className="mu-player-name">Empty</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total row */}
            <div className="mu-row mu-total-row">
              <div className="mu-player mu-player-left">
                <span className="mu-total-label">Total</span>
                <span className="mu-pts mu-pts-total">{starterTotal.toFixed(2)}</span>
              </div>
              <div className="mu-slot" />
              <div className="mu-player mu-player-right">
                <span className="mu-pts mu-pts-total">
                  {oppMatchup ? (oppMatchup.starters ?? [])
                    .reduce((s, pid) => s + (oppMatchup.players_points?.[pid] ?? 0), 0).toFixed(2) : '—'}
                </span>
                <span className="mu-total-label">Total</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Starters (no active matchup) */}
      {!myMatchup && starters.length > 0 && players && (
        <div className="myteam-section">
          <div className="myteam-section-title">Current Starters</div>
          <ul className="myteam-starters">
            {starters.map(pid => {
              const p = players[pid];
              const pos = p?.position ?? '—';
              return (
                <li key={pid} className="myteam-starter-row player-row-clickable" onClick={() => setSelectedPlayerId(pid)}>
                  <PlayerAvatar playerId={pid} position={pos} team={p?.team} size={40} />
                  <span className="myteam-starter-pos" style={{ background: posColor(pos) }}>{pos}</span>
                  <div className="myteam-starter-info">
                    <span className="myteam-starter-name">{p?.full_name ?? pid}</span>
                    <span className="myteam-starter-team">{p?.team ?? 'FA'}</span>
                  </div>
                  {salaries?.[pid] != null && (
                    <span className="salary-badge">${salaries[pid].toLocaleString()}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Bench */}
      {benchPids.length > 0 && players && myMatchup && (
        <div className="myteam-section">
          <div className="myteam-section-title">Bench</div>
          <ul className="myteam-starters">
            {benchPids.map(pid => {
              const p = players[pid];
              const pos = p?.position ?? '—';
              const name = p?.full_name ?? p?.last_name ?? pid;
              const team = p?.team ?? '';
              const pts = starterPts[pid];
              const rank = positionRank.get(pid);
              return (
                <li key={pid} className="myteam-starter-row bench-row player-row-clickable" onClick={() => setSelectedPlayerId(pid)}>
                  <PlayerAvatar playerId={pid} position={pos} team={p?.team} size={40} />
                  <span className="myteam-starter-pos" style={{ background: posColor(pos), opacity: 0.7 }}>{pos}</span>
                  <div className="myteam-starter-info">
                    <span className="myteam-starter-name">{name}</span>
                    <div className="myteam-starter-meta">
                      <span className="myteam-starter-team">{team}</span>
                      {rank && <span className="myteam-starter-rank">#{rank} {pos}</span>}
                    </div>
                  </div>
                  <div className="myteam-starter-right">
                    {salaries?.[pid] != null && (
                      <span className="salary-badge">${salaries[pid].toLocaleString()}</span>
                    )}
                    {pts !== undefined && <span className="myteam-starter-pts bench-pts">{pts.toFixed(2)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* My players in the news */}
      {myNews.length > 0 && (
        <div className="myteam-section">
          <div className="myteam-section-title">Your Players in the News</div>
          <div className="news-feed">
            {myNews.slice(0, 5).map((item) => {
              const p = players?.[item.pid];
              const pos = p?.position ?? '?';
              return (
                <a key={item.link} href={item.link} target="_blank" rel="noopener noreferrer" className="news-feed-item">
                  <div className="news-feed-meta">
                    <span className="news-pos-badge" style={{ background: POS_COLOR[pos] ?? '#888' }}>{pos}</span>
                    <span className="news-feed-player">{p?.full_name ?? item.pid}</span>
                    {p?.team && <span className="news-feed-team">{p.team}</span>}
                    <span className="news-feed-time">{timeAgo(item.published)}</span>
                  </div>
                  <div className="news-feed-headline">{item.headline}</div>
                  {item.description && <div className="news-feed-desc">{item.description}</div>}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent moves */}
      {recentTx.length > 0 && (
        <div className="myteam-section">
          <div className="myteam-section-title">Recent Moves</div>
          <ul className="myteam-tx-list">
            {recentTx.map(tx => {
              const adds = Object.keys(tx.adds ?? {});
              const drops = Object.keys(tx.drops ?? {});
              const date = new Date(tx.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <li key={tx.transaction_id} className="myteam-tx-row">
                  <span className={`tx-type tx-${tx.type}`}>{tx.type === 'free_agent' ? 'FA' : tx.type === 'waiver' ? 'WVR' : 'TRD'}</span>
                  <div className="myteam-tx-players">
                    {adds.map(pid => {
                      const p = players?.[pid];
                      return <span key={pid} className="myteam-tx-add">+ {p?.full_name ?? p?.last_name ?? pid}</span>;
                    })}
                    {drops.map(pid => {
                      const p = players?.[pid];
                      return <span key={pid} className="myteam-tx-drop">− {p?.full_name ?? p?.last_name ?? pid}</span>;
                    })}
                  </div>
                  <span className="myteam-tx-date">{date}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
