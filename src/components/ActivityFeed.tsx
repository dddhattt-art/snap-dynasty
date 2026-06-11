import { useState } from 'react';
import type { SleeperTransaction, SleeperRoster, SleeperUser, PlayersMap } from '../types/sleeper';

interface Props {
  seasonTransactions: Record<number, SleeperTransaction[]> | undefined;
  players: PlayersMap | undefined;
  userMap: Map<string, SleeperUser>;
  rosters: SleeperRoster[];
  isLoading: boolean;
}

const TX_LABELS: Record<string, string> = { trade: 'Trade', free_agent: 'Free Agent', waiver: 'Waiver' };

function fmt(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ALL_TYPES = ['all', 'trade', 'waiver', 'free_agent'] as const;

export default function ActivityFeed({ seasonTransactions, players, userMap, rosters, isLoading }: Props) {
  const [filter, setFilter] = useState<string>('all');

  if (isLoading) return <div className="loading">Loading activity…</div>;
  if (!seasonTransactions) return <div className="empty">No transaction data.</div>;

  const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

  const all = Object.entries(seasonTransactions)
    .flatMap(([week, txs]) => txs.map(tx => ({ ...tx, week: Number(week) })))
    .filter(tx => tx.status === 'complete')
    .filter(tx => filter === 'all' || tx.type === filter)
    .sort((a, b) => b.created - a.created);

  const resolvePlayer = (id: string) => players?.[id]?.full_name ?? id;
  const resolveTeam = (rosterId: number) => {
    const u = userMap.get(rosterOwner.get(rosterId) ?? '');
    return u?.display_name ?? u?.username ?? `Team ${rosterId}`;
  };

  return (
    <div className="activity-wrap">
      <div className="pos-filter" style={{ marginBottom: '1rem' }}>
        {ALL_TYPES.map(t => (
          <button
            key={t}
            className={`pos-btn ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? 'All' : TX_LABELS[t]}
          </button>
        ))}
      </div>

      {all.length === 0 ? (
        <div className="empty">No transactions found.</div>
      ) : (
        <ul className="tx-list">
          {all.slice(0, 100).map(tx => {
            const adds = Object.entries(tx.adds ?? {});
            const drops = Object.entries(tx.drops ?? {});
            const teams = tx.roster_ids.map(resolveTeam);
            return (
              <li key={tx.transaction_id} className="tx-item">
                <div className="tx-header">
                  <span className={`tx-type tx-${tx.type}`}>{TX_LABELS[tx.type] ?? tx.type}</span>
                  <span className="tx-date">Wk {tx.week} · {fmt(tx.created)}</span>
                </div>
                <div className="tx-teams">{teams.join(' ↔ ')}</div>
                {adds.map(([pid, rosterId]) => (
                  <div key={pid} className="tx-adds">
                    + {resolvePlayer(pid)} → {resolveTeam(rosterId)}
                  </div>
                ))}
                {drops.map(([pid, rosterId]) => (
                  <div key={pid} className="tx-drops">
                    − {resolvePlayer(pid)} ← {resolveTeam(rosterId)}
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
