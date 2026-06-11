import { useState, useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup, PlayersMap } from '../types/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players: PlayersMap | undefined;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

const POS_COLOR: Record<string, string> = {
  QB: 'var(--accent)',
  RB: 'var(--green)',
  WR: 'var(--yellow)',
  TE: '#e07c5c',
  K: 'var(--text-dim)',
  DEF: '#5cade0',
};

function usePlayerSeasonPts(seasonMatchups: Record<number, SleeperMatchup[]> | undefined) {
  return useMemo(() => {
    const pts: Record<string, number> = {};
    if (!seasonMatchups) return pts;
    for (const matchups of Object.values(seasonMatchups)) {
      for (const m of matchups) {
        for (const [id, p] of Object.entries(m.players_points ?? {})) {
          pts[id] = (pts[id] ?? 0) + p;
        }
      }
    }
    return pts;
  }, [seasonMatchups]);
}

interface SideProps {
  label: string;
  roster: SleeperRoster;
  players: PlayersMap;
  playerPts: Record<string, number>;
  selected: Set<string>;
  onToggle: (id: string) => void;
}

function TradeSide({ label, roster, players, playerPts, selected, onToggle }: SideProps) {
  const playerIds = roster.players ?? [];
  const sorted = [...playerIds].sort((a, b) => {
    const pa = players[a]?.position ?? 'Z';
    const pb = players[b]?.position ?? 'Z';
    return pa.localeCompare(pb);
  });

  return (
    <div className="trade-side">
      <div className="trade-side-label">{label}</div>
      <ul className="player-list">
        {sorted.map(id => {
          const p = players[id];
          const pts = playerPts[id] ?? 0;
          const sel = selected.has(id);
          return (
            <li
              key={id}
              className={`player-row trade-player ${sel ? 'trade-selected' : ''}`}
              onClick={() => onToggle(id)}
            >
              <span
                className="player-pos"
                style={{ color: POS_COLOR[p?.position ?? ''] ?? 'var(--text-dim)' }}
              >
                {p?.position ?? '?'}
              </span>
              <span className="player-name">{p?.full_name ?? id}</span>
              <span className="trade-pts">{pts > 0 ? pts.toFixed(1) : '—'}</span>
              <span className={`trade-check ${sel ? 'checked' : ''}`}>{sel ? '✓' : '+'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function TradeAnalyzer({ rosters, userMap, players, seasonMatchups, isLoading }: Props) {
  const [teamA, setTeamA] = useState<number>(rosters[0]?.roster_id ?? 0);
  const [teamB, setTeamB] = useState<number>(rosters[1]?.roster_id ?? 0);
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());

  const playerPts = usePlayerSeasonPts(seasonMatchups);

  const rosterA = rosters.find(r => r.roster_id === teamA);
  const rosterB = rosters.find(r => r.roster_id === teamB);

  const teamLabel = (rosterId: number) => {
    const r = rosters.find(x => x.roster_id === rosterId);
    const u = userMap.get(r?.owner_id ?? '');
    return u?.display_name ?? u?.username ?? `Team ${rosterId}`;
  };

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const totalPts = (ids: Set<string>) =>
    [...ids].reduce((s, id) => s + (playerPts[id] ?? 0), 0);

  const valA = totalPts(selectedA);
  const valB = totalPts(selectedB);
  const hasSelection = selectedA.size > 0 || selectedB.size > 0;

  if (isLoading || !players) return <div className="loading">Loading trade analyzer…</div>;

  return (
    <div className="trade-wrap">
      <div className="trade-selectors">
        <select
          className="h2h-select"
          value={teamA}
          onChange={e => { setTeamA(Number(e.target.value)); setSelectedA(new Set()); }}
        >
          {rosters.map(r => (
            <option key={r.roster_id} value={r.roster_id}>{teamLabel(r.roster_id)}</option>
          ))}
        </select>
        <span className="h2h-vs">↔</span>
        <select
          className="h2h-select"
          value={teamB}
          onChange={e => { setTeamB(Number(e.target.value)); setSelectedB(new Set()); }}
        >
          {rosters.map(r => (
            <option key={r.roster_id} value={r.roster_id}>{teamLabel(r.roster_id)}</option>
          ))}
        </select>
      </div>

      <p className="trade-hint">Click players to add them to the trade.</p>

      {hasSelection && (
        <div className="trade-summary">
          <div className={`trade-summary-side ${valA >= valB ? 'trade-winning' : 'trade-losing'}`}>
            <span className="trade-summary-name">{teamLabel(teamA)} gives</span>
            <span className="trade-summary-pts">{valA.toFixed(1)} pts</span>
            <div className="trade-summary-players">
              {[...selectedA].map(id => players[id]?.full_name ?? id).join(', ') || '—'}
            </div>
          </div>
          <div className={`trade-summary-side ${valB >= valA ? 'trade-winning' : 'trade-losing'}`}>
            <span className="trade-summary-name">{teamLabel(teamB)} gives</span>
            <span className="trade-summary-pts">{valB.toFixed(1)} pts</span>
            <div className="trade-summary-players">
              {[...selectedB].map(id => players[id]?.full_name ?? id).join(', ') || '—'}
            </div>
          </div>
        </div>
      )}

      <div className="trade-sides">
        {rosterA && (
          <TradeSide
            label={teamLabel(teamA)}
            roster={rosterA}
            players={players}
            playerPts={playerPts}
            selected={selectedA}
            onToggle={id => setSelectedA(prev => toggle(prev, id))}
          />
        )}
        {rosterB && (
          <TradeSide
            label={teamLabel(teamB)}
            roster={rosterB}
            players={players}
            playerPts={playerPts}
            selected={selectedB}
            onToggle={id => setSelectedB(prev => toggle(prev, id))}
          />
        )}
      </div>
    </div>
  );
}
