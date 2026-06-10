import type { SleeperTransaction, SleeperRoster, SleeperUser } from '../types/sleeper';

interface Props {
  transactions: SleeperTransaction[];
  userMap: Map<string, SleeperUser>;
  rosters: SleeperRoster[];
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

export default function Transactions({ transactions, userMap, rosters, isLoading }: Props) {
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
                + {adds.join(', ')}
              </div>
            )}
            {drops.length > 0 && (
              <div className="tx-drops">
                − {drops.join(', ')}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
