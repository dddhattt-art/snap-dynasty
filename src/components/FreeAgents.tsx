import { useState, useMemo } from 'react';
import type { SleeperRoster, SleeperPlayer, PlayersMap } from '../types/sleeper';
import PlayerAvatar from './PlayerAvatar';
import PlayerPanel from './PlayerPanel';

interface Props {
  rosters: SleeperRoster[];
  players: PlayersMap | undefined;
  isLoading: boolean;
  season?: string;
}

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const POS_COLOR: Record<string, string> = {
  QB: 'var(--accent)',
  RB: 'var(--green)',
  WR: 'var(--yellow)',
  TE: '#e07c5c',
  K: 'var(--text-dim)',
  DEF: '#5cade0',
};

export default function FreeAgents({ rosters, players, isLoading, season = '2024' }: Props) {
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState('ALL');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const ownedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rosters) for (const id of r.players ?? []) ids.add(id);
    return ids;
  }, [rosters]);

  const freeAgents = useMemo((): SleeperPlayer[] => {
    if (!players) return [];
    return Object.values(players).filter(p =>
      !ownedIds.has(p.player_id) &&
      p.full_name &&
      (p.position === 'QB' || p.position === 'RB' || p.position === 'WR' ||
       p.position === 'TE' || p.position === 'K' || p.position === 'DEF') &&
      p.team
    );
  }, [players, ownedIds]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return freeAgents
      .filter(p => (pos === 'ALL' || p.position === pos) && (!q || p.full_name.toLowerCase().includes(q)))
      .sort((a, b) => (a.search_rank ?? 9999) - (b.search_rank ?? 9999))
      .slice(0, 80);
  }, [freeAgents, pos, search]);

  if (isLoading) return <div className="loading">Loading players…</div>;
  if (!players) return <div className="loading">Loading free agents…</div>;

  return (
    <div className="fa-wrap">
      <PlayerPanel playerId={selectedPlayerId} players={players} onClose={() => setSelectedPlayerId(null)} />
      <div className="fa-controls">
        <input
          type="text"
          placeholder="Search player…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="fa-search"
        />
        <div className="pos-filter">
          {POSITIONS.map(p => (
            <button
              key={p}
              className={`pos-btn ${pos === p ? 'active' : ''}`}
              onClick={() => setPos(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">No free agents match.</div>
      ) : (
        <ul className="player-list">
          {filtered.map(p => (
            <li key={p.player_id} className="player-row player-row-clickable" onClick={() => setSelectedPlayerId(p.player_id)}>
              <PlayerAvatar playerId={p.player_id} position={p.position} team={p.team} size={28} />
              <span className="player-pos" style={{ color: POS_COLOR[p.position] ?? 'var(--text-dim)' }}>
                {p.position}
              </span>
              <span className="player-name">{p.full_name}</span>
              <span className="player-team">{p.team ?? 'FA'}</span>
              {p.injury_status && (
                <span className="player-injury">{p.injury_status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
