import { useState } from 'react';
import type { SleeperRoster, SleeperUser, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';
import PlayerAvatar from './PlayerAvatar';
import PlayerPanel from './PlayerPanel';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players: PlayersMap | undefined;
  userId?: string;
  isLoading: boolean;

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

export default function Roster({ rosters, userMap, players, userId, isLoading }: Props) {
  const myRoster = userId ? rosters.find(r => r.owner_id === userId) : undefined;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(
    myRoster?.roster_id ?? rosters[0]?.roster_id ?? null
  );

  if (isLoading) return <div className="loading">Loading players…</div>;
  if (!players) return <div className="loading">Loading roster…</div>;
  if (!rosters.length) return <div className="empty">No rosters available.</div>;

  const roster = rosters.find(r => r.roster_id === selectedRosterId) ?? rosters[0];
  const user = userMap.get(roster.owner_id);
  const starters = new Set(roster.starters ?? []);
  const allPlayers = roster.players ?? [];

  const starterList = (roster.starters ?? []).map(id => ({ id, player: players[id], isStarter: true }));
  const benchList = allPlayers
    .filter(id => !starters.has(id))
    .map(id => ({ id, player: players[id], isStarter: false }))
    .sort((a, b) => {
      const pa = POS_ORDER.indexOf(a.player?.position ?? '') ?? 99;
      const pb = POS_ORDER.indexOf(b.player?.position ?? '') ?? 99;
      return pa - pb;
    });

  return (
    <div className="roster-wrap">
      <PlayerPanel playerId={selectedPlayerId} players={players} onClose={() => setSelectedPlayerId(null)} />
      <div className="roster-selector">
        {rosters.map(r => {
          const u = userMap.get(r.owner_id);
          const av = u ? avatarUrl(u.avatar) : null;
          return (
            <button
              key={r.roster_id}
              className={`roster-team-btn ${r.roster_id === roster.roster_id ? 'active' : ''}`}
              onClick={() => setSelectedRosterId(r.roster_id)}
            >
              {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
              <span>{u?.display_name ?? u?.username ?? `Team ${r.roster_id}`}</span>
            </button>
          );
        })}
      </div>

      <div className="roster-header">
        {user && avatarUrl(user.avatar) && (
          <img loading="lazy" src={avatarUrl(user.avatar)!} alt="" className="avatar-sm" />
        )}
        <span className="roster-owner">{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
        <span className="roster-count">{allPlayers.length} players</span>
      </div>

      <section className="roster-section">
        <h4 className="roster-section-title">Starters</h4>
        <ul className="player-list">
          {starterList.map(({ id, player }) => (
            <li key={id} className="player-row player-row-clickable" onClick={() => setSelectedPlayerId(id)}>
              <PlayerAvatar playerId={id} position={player?.position} team={player?.team} size={28} />
              <span className="player-pos" style={{ color: posColor(player?.position ?? '') }}>
                {player?.position ?? '—'}
              </span>
              <span className="player-name">{player?.full_name ?? id}</span>
              <span className="player-team">{player?.team ?? 'FA'}</span>
              {player?.injury_status && (
                <span className="player-injury">{player.injury_status}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="roster-section">
        <h4 className="roster-section-title">Bench</h4>
        <ul className="player-list">
          {benchList.map(({ id, player }) => (
            <li key={id} className="player-row bench">
              <PlayerAvatar playerId={id} position={player?.position} team={player?.team} size={28} />
              <span className="player-pos" style={{ color: posColor(player?.position ?? '') }}>
                {player?.position ?? '—'}
              </span>
              <span className="player-name">{player?.full_name ?? id}</span>
              <span className="player-team">{player?.team ?? 'FA'}</span>
              {player?.injury_status && (
                <span className="player-injury">{player.injury_status}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
