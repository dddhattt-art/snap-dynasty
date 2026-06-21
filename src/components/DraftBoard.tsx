import { useState, useMemo, useEffect } from 'react';
import type { SleeperPlayer, PlayersMap } from '../types/sleeper';
import PlayerAvatar from './PlayerAvatar';
import PlayerPanel from './PlayerPanel';
import type { SalaryMap } from '../hooks/useSalaries';

interface Props {
  players: PlayersMap | undefined;
  leagueId: string;
  teamCount?: number;
  isLoading: boolean;
  salaries?: SalaryMap;
  cap?: number;
}

function fmtM(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;

const POS_COLOR: Record<string, string> = {
  QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a', K: '#6b1c6b', DEF: '#1a5fa8',
};

function storageKey(leagueId: string) {
  return `snap_draft_${leagueId}`;
}

function loadState(leagueId: string) {
  try {
    const raw = localStorage.getItem(storageKey(leagueId));
    if (!raw) return { drafted: [] as string[], queue: [] as string[], myPicks: [] as string[] };
    return JSON.parse(raw) as { drafted: string[]; queue: string[]; myPicks: string[] };
  } catch {
    return { drafted: [] as string[], queue: [] as string[], myPicks: [] as string[] };
  }
}

function saveState(leagueId: string, state: { drafted: string[]; queue: string[]; myPicks: string[] }) {
  localStorage.setItem(storageKey(leagueId), JSON.stringify(state));
}

export default function DraftBoard({ players, leagueId, teamCount = 12, isLoading, salaries, cap }: Props) {
  const [pos, setPos] = useState<string>('ALL');
  const [hideDrafted, setHideDrafted] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [drafted, setDrafted] = useState<Set<string>>(() => new Set(loadState(leagueId).drafted));
  const [queue, setQueue] = useState<Set<string>>(() => new Set(loadState(leagueId).queue));
  const [myPicks, setMyPicks] = useState<string[]>(() => loadState(leagueId).myPicks);

  // Persist to localStorage on every change
  useEffect(() => {
    saveState(leagueId, {
      drafted: [...drafted],
      queue: [...queue],
      myPicks,
    });
  }, [drafted, queue, myPicks, leagueId]);

  const ranked = useMemo((): SleeperPlayer[] => {
    if (!players) return [];
    return Object.values(players)
      .filter(p =>
        p.full_name &&
        ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position) &&
        p.search_rank > 0 && p.search_rank < 999
      )
      .sort((a, b) => a.search_rank - b.search_rank);
  }, [players]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ranked.filter(p =>
      (pos === 'ALL' || p.position === pos) &&
      (!q || p.full_name.toLowerCase().includes(q)) &&
      (!hideDrafted || !drafted.has(p.player_id))
    );
  }, [ranked, pos, search, hideDrafted, drafted]);

  // Tier = every teamCount picks
  function tierLabel(overallRank: number): number {
    return Math.ceil(overallRank / teamCount);
  }

  function draft(p: SleeperPlayer) {
    if (drafted.has(p.player_id)) return;
    setDrafted(prev => new Set([...prev, p.player_id]));
    setMyPicks(prev => [...prev, p.player_id]);
    setQueue(prev => { const n = new Set(prev); n.delete(p.player_id); return n; });
  }

  function undraft(playerId: string) {
    setDrafted(prev => { const n = new Set(prev); n.delete(playerId); return n; });
    setMyPicks(prev => prev.filter(id => id !== playerId));
  }

  function toggleQueue(playerId: string) {
    setQueue(prev => {
      const n = new Set(prev);
      if (n.has(playerId)) n.delete(playerId);
      else n.add(playerId);
      return n;
    });
  }

  function reset() {
    if (!confirm('Reset the entire draft board? This clears all picks and your queue.')) return;
    setDrafted(new Set());
    setQueue(new Set());
    setMyPicks([]);
  }

  if (isLoading) return <div className="loading">Loading players…</div>;
  if (!players) return <div className="loading">Loading draft board…</div>;

  // Cap calculations
  const myPicksSalary = myPicks.reduce((sum, pid) => sum + (salaries?.[pid] ?? 0), 0);
  const hasCap = !!(cap && cap > 0);
  const capPct = hasCap ? Math.min(myPicksSalary / cap, 1) : 0;
  const capOver = hasCap && myPicksSalary > cap;

  let lastTier = 0;
  const rankedWithTiers = ranked.map((p, i) => ({ p, rank: i + 1, tier: tierLabel(i + 1) }));

  // Build a rank map so we can show overall rank even when filtered
  const rankMap = new Map(rankedWithTiers.map(({ p, rank }) => [p.player_id, rank]));

  return (
    <div className="db-wrap">
      <PlayerPanel playerId={selectedPlayerId} players={players} onClose={() => setSelectedPlayerId(null)} />

      <div className="db-layout">

        {/* Left: cheat sheet */}
        <div className="db-main">
          <div className="db-controls">
            <input
              className="db-search"
              type="text"
              placeholder="Search player…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="db-pos-filter">
              {POSITIONS.map(p => (
                <button key={p} className={`db-pos-btn ${pos === p ? 'active' : ''}`} onClick={() => setPos(p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="db-actions">
              <button className={`db-toggle ${hideDrafted ? 'active' : ''}`} onClick={() => setHideDrafted(v => !v)}>
                <i className="ti ti-eye-off" /> Hide Drafted
              </button>
              <button className="db-reset" onClick={reset}>
                <i className="ti ti-refresh" /> Reset
              </button>
            </div>
          </div>

          {/* Cap strip */}
          {(myPicksSalary > 0 || hasCap) && (
            <div className="db-cap-strip">
              <div className="db-cap-strip-row">
                <span className="db-cap-label">My Picks</span>
                <span className={`db-cap-committed ${capOver ? 'over' : ''}`}>{myPicksSalary > 0 ? fmtM(myPicksSalary) : '—'}</span>
                {hasCap && <>
                  <span className="db-cap-sep">/</span>
                  <span className="db-cap-total">{fmtM(cap)}</span>
                  <span className={`db-cap-rem ${capOver ? 'over' : ''}`}>
                    {capOver ? `${fmtM(myPicksSalary - cap)} over` : `${fmtM(cap - myPicksSalary)} left`}
                  </span>
                </>}
              </div>
              {hasCap && (
                <div className="db-cap-bar">
                  <div className={`db-cap-bar-fill ${capOver ? 'over' : ''}`} style={{ width: `${capPct * 100}%` }} />
                </div>
              )}
            </div>
          )}

          <div className="db-list">
            {filtered.length === 0 && <div className="empty">No players match.</div>}
            {filtered.map(p => {
              const rank = rankMap.get(p.player_id) ?? 999;
              const tier = tierLabel(rank);
              const isDrafted = drafted.has(p.player_id);
              const inQueue = queue.has(p.player_id);
              const showTierBand = tier !== lastTier;
              lastTier = tier;

              return (
                <div key={p.player_id}>
                  {showTierBand && (
                    <div className="db-tier-band">
                      <span>Tier {tier}</span>
                      <span className="db-tier-range">Picks {(tier - 1) * teamCount + 1}–{tier * teamCount}</span>
                    </div>
                  )}
                  <div className={`db-row ${isDrafted ? 'db-row-drafted' : ''} ${inQueue ? 'db-row-queued' : ''}`}>
                    <span className="db-rank">{rank}</span>
                    <div className="db-av" onClick={() => setSelectedPlayerId(p.player_id)}>
                      <PlayerAvatar playerId={p.player_id} position={p.position} team={p.team} size={36} />
                    </div>
                    <div className="db-info" onClick={() => setSelectedPlayerId(p.player_id)}>
                      <span className="db-name">{p.full_name}</span>
                      <div className="db-meta">
                        <span className="db-pos-badge" style={{ color: POS_COLOR[p.position] ?? '#888' }}>{p.position}</span>
                        {p.team && <span className="db-team">{p.team}</span>}
                        {p.age && <span className="db-age">{p.age}y</span>}
                      </div>
                    </div>
                    {(() => {
                      const salary = salaries?.[p.player_id];
                      const newTotal = myPicksSalary + (salary ?? 0);
                      const wouldOverCap = hasCap && salary != null && newTotal > cap!;
                      return salary != null ? (
                        <div className="db-salary-col">
                          <span className="db-salary-badge">{fmtM(salary)}</span>
                          {!isDrafted && hasCap && (
                            <span className={`db-salary-delta ${wouldOverCap ? 'over' : ''}`}>
                              {wouldOverCap ? `⚠ ${fmtM(newTotal - cap!)} over` : `→ ${fmtM(cap! - newTotal)} left`}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })()}
                    <div className="db-row-actions">
                      <button
                        className={`db-queue-btn ${inQueue ? 'active' : ''}`}
                        onClick={() => toggleQueue(p.player_id)}
                        title={inQueue ? 'Remove from queue' : 'Add to queue'}
                        disabled={isDrafted}
                      >
                        <i className={`ti ${inQueue ? 'ti-star-filled' : 'ti-star'}`} />
                      </button>
                      {isDrafted ? (
                        <button className="db-undraft-btn" onClick={() => undraft(p.player_id)} title="Undo draft">
                          <i className="ti ti-arrow-back-up" />
                        </button>
                      ) : (() => {
                        const salary = salaries?.[p.player_id];
                        const wouldOver = hasCap && salary != null && (myPicksSalary + salary) > cap!;
                        return (
                          <button
                            className={`db-draft-btn ${wouldOver ? 'db-draft-btn--over' : ''}`}
                            onClick={() => draft(p)}
                            title={wouldOver ? 'Over cap — you\'ll need to drop someone' : 'Mark as drafted'}
                          >
                            {wouldOver ? '⚠ Draft' : 'Draft'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="db-sidebar">
          {/* Queue */}
          {queue.size > 0 && (
            <div className="db-panel">
              <div className="db-panel-title"><i className="ti ti-star" /> My Queue ({queue.size})</div>
              {[...queue].map(pid => {
                const p = players[pid];
                if (!p) return null;
                return (
                  <div key={pid} className="db-sidebar-row" onClick={() => setSelectedPlayerId(pid)}>
                    <PlayerAvatar playerId={pid} position={p.position} team={p.team} size={28} />
                    <div className="db-sidebar-info">
                      <span className="db-sidebar-name">{p.full_name}</span>
                      <span className="db-sidebar-meta">{p.position} · {p.team ?? 'FA'}</span>
                    </div>
                    <button className="db-sidebar-btn" onClick={e => { e.stopPropagation(); draft(p); }} title="Draft">
                      <i className="ti ti-check" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* My picks */}
          <div className="db-panel">
            <div className="db-panel-title"><i className="ti ti-trophy" /> My Picks ({myPicks.length})</div>
            {myPicks.length === 0 ? (
              <div className="db-panel-empty">No picks yet. Click "Draft" to add your picks.</div>
            ) : (
              myPicks.map((pid, i) => {
                const p = players[pid];
                if (!p) return null;
                return (
                  <div key={pid} className="db-sidebar-row" onClick={() => setSelectedPlayerId(pid)}>
                    <span className="db-pick-num">Rd {Math.ceil((i + 1) / teamCount)}.{((i % teamCount) + 1).toString().padStart(2, '0')}</span>
                    <div className="db-sidebar-info">
                      <span className="db-sidebar-name">{p.full_name}</span>
                      <span className="db-sidebar-meta">{p.position} · {p.team ?? 'FA'}</span>
                    </div>
                    <button className="db-sidebar-btn db-undo-btn" onClick={e => { e.stopPropagation(); undraft(pid); }} title="Undo">
                      <i className="ti ti-x" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Stats */}
          <div className="db-panel db-stats-panel">
            <div className="db-stats-row">
              <span>{drafted.size}</span><span>Total Drafted</span>
            </div>
            <div className="db-stats-row">
              <span>{myPicks.length}</span><span>My Picks</span>
            </div>
            <div className="db-stats-row">
              <span>{ranked.length - drafted.size}</span><span>Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
