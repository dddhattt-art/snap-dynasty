import { useState } from 'react';
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
        {salaries && (() => {
          const total = teamTotal(roster, salaries);
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

      <section className="roster-section">
        <h4 className="roster-section-title">Starters</h4>
        <ul className="player-list">
          {starterList.map(({ id, player }) => (
            <li key={id} className="player-row player-row-clickable" onClick={() => setSelectedPlayerId(id)}>
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
            </li>
          ))}
        </ul>
      </section>

      <section className="roster-section">
        <h4 className="roster-section-title">Bench</h4>
        <ul className="player-list">
          {benchList.map(({ id, player }) => (
            <li key={id} className="player-row bench">
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
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
