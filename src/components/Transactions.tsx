import type { SleeperTransaction, SleeperRoster, SleeperUser, PlayersMap } from '../types/sleeper';

const POS_COLORS: Record<string, string> = {
  QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a',
  K: '#6b1c6b', DEF: '#444', FLEX: '#555',
};

interface Props {
  transactions: SleeperTransaction[];
  userMap: Map<string, SleeperUser>;
  rosters: SleeperRoster[];
  players?: PlayersMap;
  isLoading: boolean;
}

const TX_LABELS: Record<string, string> = {
  trade: 'Trade',
  free_agent: 'Free Agent',
  waiver: 'Waiver',
};

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PlayerChip({ playerId, players }: { playerId: string; players?: PlayersMap }) {
  const p = players?.[playerId];
  const name = p?.full_name ?? p?.last_name ?? `Player ${playerId}`;
  const pos = p?.position ?? '';
  const color = POS_COLORS[pos] ?? '#555';
  return (
    <span className="player-chip">
      {pos && <span className="player-pos" style={{ background: color }}>{pos}</span>}
      <span>{name}</span>
    </span>
  );
}

export default function Transactions({ transactions, userMap, rosters, players, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading transactions…</div>;
  if (!transactions.length) return <div className="empty">No transactions this week.</div>;

  const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

  const sorted = [...transactions].sort((a, b) => b.created - a.created);

  return (
    <ul className="tx-list">
      {sorted.map(tx => {
        const ownerIds = tx.roster_ids.map(id => rosterOwner.get(id) ?? '');
        const teams = ownerIds.map(id => {
          const u = userMap.get(id);
          return u?.display_name ?? u?.username ?? `Team`;
        });

        const adds = Object.keys(tx.adds ?? {});
        const drops = Object.keys(tx.drops ?? {});

        return (
          <li key={tx.transaction_id} className="tx-item">
            <div className="tx-header">
              <span className={`tx-type tx-${tx.type}`}>{TX_LABELS[tx.type] ?? tx.type}</span>
              <span className="tx-date">{formatDate(tx.created)}</span>
            </div>
            <div className="tx-teams">{teams.join(' ↔ ')}</div>
            {adds.length > 0 && (
              <div className="tx-adds">
                <span className="tx-label-add">+</span>
                <span className="tx-player-list">
                  {adds.map(id => <PlayerChip key={id} playerId={id} players={players} />)}
                </span>
              </div>
            )}
            {drops.length > 0 && (
              <div className="tx-drops">
                <span className="tx-label-drop">−</span>
                <span className="tx-player-list">
                  {drops.map(id => <PlayerChip key={id} playerId={id} players={players} />)}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
