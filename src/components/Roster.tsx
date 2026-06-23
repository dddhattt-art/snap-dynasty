import { useState, useMemo, useEffect } from 'react';
import type { SleeperRoster, SleeperUser, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';
import PlayerAvatar from './PlayerAvatar';
import PlayerPanel from './PlayerPanel';
import type { SalaryMap } from '../hooks/useSalaries';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players: PlayersMap | undefined;
  userId?: string;
  isLoading: boolean;
  salaries?: SalaryMap;
  setSalary?: (playerId: string, amount: number) => void;
  cap?: number;
}

const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'];
const POS_COLOR: Record<string, string> = {
  QB: 'var(--accent)',
  RB: 'var(--green)',
  WR: 'var(--yellow)',
  TE: '#e07c5c',
  K: 'var(--text-dim)',
  DEF: '#5cade0',
};

function posColor(pos: string) {
  return POS_COLOR[pos] ?? 'var(--text-dim)';
}

function teamTotal(roster: SleeperRoster, salaries: SalaryMap | undefined): number {
  if (!salaries) return 0;
  return (roster.players ?? []).reduce((sum, pid) => sum + (salaries[pid] ?? 0), 0);
}

function fmtM(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

export default function Roster({ rosters, userMap, players, userId, isLoading, salaries, setSalary, cap }: Props) {
  const myRoster = userId ? rosters.find(r => r.owner_id === userId) : undefined;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(
    myRoster?.roster_id ?? rosters[0]?.roster_id ?? null
  );

  // Planning mode state
  const [planningMode, setPlanningMode] = useState(false);
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [addSearch, setAddSearch] = useState('');

  // Exit planning mode when switching teams
  useEffect(() => {
    setPlanningMode(false);
    setDroppedIds(new Set());
    setAddedIds([]);
    setAddSearch('');
  }, [selectedRosterId]);

  if (isLoading) return <div className="loading">Loading players…</div>;
  if (!players) return <div className="loading">Loading roster…</div>;
  if (!rosters.length) return <div className="empty">No rosters available.</div>;

  const roster = rosters.find(r => r.roster_id === selectedRosterId) ?? rosters[0];
  const user = userMap.get(roster.owner_id);
  const starters = new Set((roster.starters ?? []).filter(pid => pid !== '0'));
  const allPlayers = (roster.players ?? []).filter(pid => pid !== '0');
  const isMyTeam = !!userId && roster.owner_id === userId;

  const starterList = (roster.starters ?? []).filter(id => id !== '0').map(id => ({ id, player: players[id], isStarter: true }));
  const benchList = allPlayers
    .filter(id => !starters.has(id))
    .map(id => ({ id, player: players[id], isStarter: false }))
    .sort((a, b) => {
      const pa = POS_ORDER.indexOf(a.player?.position ?? '') ?? 99;
      const pb = POS_ORDER.indexOf(b.player?.position ?? '') ?? 99;
      return pa - pb;
    });

  // All player IDs currently owned across the whole league
  const ownedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rosters) for (const id of r.players ?? []) ids.add(id);
    return ids;
  }, [rosters]);

  // Free agent search results for planning mode
  const faResults = useMemo(() => {
    if (!planningMode || !addSearch.trim() || !players) return [];
    const q = addSearch.toLowerCase();
    return Object.values(players)
      .filter(p =>
        !ownedIds.has(p.player_id) &&
        !addedIds.includes(p.player_id) &&
        p.full_name?.toLowerCase().includes(q) &&
        ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position ?? '') &&
        p.team
      )
      .sort((a, b) => (a.search_rank ?? 9999) - (b.search_rank ?? 9999))
      .slice(0, 8);
  }, [planningMode, addSearch, players, ownedIds, addedIds]);

  // Cap total for planning mode (drop removed players, add new ones)
  const planningTotal = useMemo(() => {
    if (!salaries) return 0;
    const keptIds = allPlayers.filter(id => !droppedIds.has(id));
    return [...keptIds, ...addedIds].reduce((sum, id) => sum + (salaries[id] ?? 0), 0);
  }, [allPlayers, droppedIds, addedIds, salaries]);

  const displayTotal = planningMode ? planningTotal : teamTotal(roster, salaries);

  return (
    <div className="roster-wrap">
      <PlayerPanel playerId={selectedPlayerId} players={players} onClose={() => setSelectedPlayerId(null)} salaries={salaries} setSalary={setSalary} />
      <div className="roster-selector">
        {rosters.map(r => {
          const u = userMap.get(r.owner_id);
          const av = u ? avatarUrl(u.avatar) : null;
          const total = teamTotal(r, salaries);
          const hasCap = cap && cap > 0;
          const over = hasCap && total > cap;
          return (
            <button
              key={r.roster_id}
              className={`roster-team-btn ${r.roster_id === roster.roster_id ? 'active' : ''}`}
              onClick={() => setSelectedRosterId(r.roster_id)}
            >
              {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
              <span className="roster-btn-name">{u?.display_name ?? u?.username ?? `Team ${r.roster_id}`}</span>
              {total > 0 && (
                <span className={`roster-btn-salary ${over ? 'cap-over' : ''}`}>{fmtM(total)}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Roster header + cap bar */}
      <div className="roster-header">
        {user && avatarUrl(user.avatar) && (
          <img loading="lazy" src={avatarUrl(user.avatar)!} alt="" className="avatar-sm" />
        )}
        <span className="roster-owner">{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
        <span className="roster-count">{allPlayers.length} players</span>
        {isMyTeam && (
          planningMode ? (
            <button
              className="plan-exit-btn"
              onClick={() => { setPlanningMode(false); setDroppedIds(new Set()); setAddedIds([]); setAddSearch(''); }}
            >
              Exit Planning
            </button>
          ) : (
            <button className="plan-enter-btn" onClick={() => setPlanningMode(true)}>
              Plan Roster
            </button>
          )
        )}
        {salaries && (() => {
          const total = displayTotal;
          const hasCap = cap && cap > 0;
          const over = hasCap && total > cap;
          const pct = hasCap ? Math.min(total / cap, 1) : 0;
          if (total === 0) return null;
          return (
            <div className="roster-cap-info">
              <span className={`roster-cap-total ${over ? 'cap-over' : ''}`}>{fmtM(total)}</span>
              {hasCap && (
                <>
                  <span className="roster-cap-sep">/ {fmtM(cap)}</span>
                  <span className={`roster-cap-rem ${over ? 'cap-over' : 'cap-under'}`}>
                    {over ? `${fmtM(total - cap)} over` : `${fmtM(cap - total)} under`}
                  </span>
                  <div className="roster-cap-bar-track">
                    <div className={`roster-cap-bar-fill ${over ? 'cap-bar-fill--over' : ''}`} style={{ width: `${pct * 100}%` }} />
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Planning mode banner */}
      {planningMode && (
        <div className="plan-banner">
          <span>Planning Mode — changes are local only</span>
          {(droppedIds.size > 0 || addedIds.length > 0) && (
            <span className="plan-banner-delta">
              {droppedIds.size > 0 && `−${droppedIds.size} dropped`}
              {droppedIds.size > 0 && addedIds.length > 0 && ' · '}
              {addedIds.length > 0 && `+${addedIds.length} added`}
            </span>
          )}
        </div>
      )}

      <section className="roster-section">
        <h4 className="roster-section-title">Starters</h4>
        <ul className="player-list">
          {starterList.filter(({ id }) => !planningMode || !droppedIds.has(id)).map(({ id, player }) => (
            <li key={id} className="player-row player-row-clickable" onClick={() => !planningMode && setSelectedPlayerId(id)}>
              <PlayerAvatar playerId={id} position={player?.position} team={player?.team} size={36} />
              <span className="player-pos" style={{ color: posColor(player?.position ?? '') }}>
                {player?.position ?? '—'}
              </span>
              <span className="player-name">{player?.full_name ?? id}</span>
              <span className="player-team">{player?.team ?? 'FA'}</span>
              {player?.injury_status && (
                <span className="player-injury">{player.injury_status}</span>
              )}
              {salaries?.[id] != null && (
                <span className="salary-badge">${salaries[id].toLocaleString()}</span>
              )}
              {planningMode && isMyTeam && (
                <button
                  className="plan-drop-btn"
                  onClick={e => { e.stopPropagation(); setDroppedIds(prev => new Set([...prev, id])); }}
                >
                  Drop
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="roster-section">
        <h4 className="roster-section-title">Bench</h4>
        <ul className="player-list">
          {benchList.filter(({ id }) => !planningMode || !droppedIds.has(id)).map(({ id, player }) => (
            <li key={id} className={`player-row bench${planningMode ? '' : ''}`}>
              <PlayerAvatar playerId={id} position={player?.position} team={player?.team} size={36} />
              <span className="player-pos" style={{ color: posColor(player?.position ?? '') }}>
                {player?.position ?? '—'}
              </span>
              <span className="player-name">{player?.full_name ?? id}</span>
              <span className="player-team">{player?.team ?? 'FA'}</span>
              {player?.injury_status && (
                <span className="player-injury">{player.injury_status}</span>
              )}
              {salaries?.[id] != null && (
                <span className="salary-badge">${salaries[id].toLocaleString()}</span>
              )}
              {planningMode && isMyTeam && (
                <button
                  className="plan-drop-btn"
                  onClick={() => setDroppedIds(prev => new Set([...prev, id]))}
                >
                  Drop
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Planning mode: added players + FA search */}
      {planningMode && isMyTeam && (
        <section className="roster-section plan-add-section">
          {addedIds.length > 0 && (
            <>
              <h4 className="roster-section-title plan-added-title">Planned Adds</h4>
              <ul className="player-list">
                {addedIds.map(id => {
                  const player = players[id];
                  return (
                    <li key={id} className="player-row plan-added-row">
                      <PlayerAvatar playerId={id} position={player?.position} team={player?.team} size={36} />
                      <span className="player-pos" style={{ color: posColor(player?.position ?? '') }}>
                        {player?.position ?? '—'}
                      </span>
                      <span className="player-name">{player?.full_name ?? id}</span>
                      <span className="player-team">{player?.team ?? 'FA'}</span>
                      {salaries?.[id] != null && (
                        <span className="salary-badge">${salaries[id].toLocaleString()}</span>
                      )}
                      <button
                        className="plan-drop-btn"
                        onClick={() => setAddedIds(prev => prev.filter(i => i !== id))}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <h4 className="roster-section-title plan-added-title">Add Free Agent</h4>
          <div className="plan-fa-search-wrap">
            <input
              type="text"
              className="plan-fa-search"
              placeholder="Search free agents…"
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              autoComplete="off"
            />
            {faResults.length > 0 && (
              <ul className="plan-fa-results">
                {faResults.map(p => (
                  <li
                    key={p.player_id}
                    className="plan-fa-result-row"
                    onClick={() => { setAddedIds(prev => [...prev, p.player_id]); setAddSearch(''); }}
                  >
                    <span className="player-pos" style={{ color: posColor(p.position ?? '') }}>{p.position}</span>
                    <span className="player-name">{p.full_name}</span>
                    <span className="player-team">{p.team ?? 'FA'}</span>
                    {salaries?.[p.player_id] != null && (
                      <span className="salary-badge">${salaries[p.player_id].toLocaleString()}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
