import type { SleeperRoster, SleeperUser, SleeperTransaction, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  seasonTransactions: Record<number, SleeperTransaction[]> | undefined;
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players?: PlayersMap;
  isLoading: boolean;
}

function teamName(rosterId: number, rosters: SleeperRoster[], userMap: Map<string, SleeperUser>) {
  const r = rosters.find(x => x.roster_id === rosterId);
  const u = userMap.get(r?.owner_id ?? '');
  return u?.display_name ?? u?.username ?? `Team ${rosterId}`;
}

function TeamAvatar({ rosterId, rosters, userMap }: { rosterId: number; rosters: SleeperRoster[]; userMap: Map<string, SleeperUser> }) {
  const r = rosters.find(x => x.roster_id === rosterId);
  const u = userMap.get(r?.owner_id ?? '');
  const av = u ? avatarUrl(u.avatar) : null;
  return av ? <img loading="lazy" src={av} alt="" className="avatar-xs" /> : <div className="avatar-xs" style={{ background: 'var(--surface2)', borderRadius: '50%' }} />;
}

export default function TradeHistory({ seasonTransactions, rosters, userMap, players, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading trade history…</div>;
  if (!seasonTransactions) return <div className="empty">No season data yet.</div>;

  const trades = Object.entries(seasonTransactions)
    .flatMap(([weekStr, txs]) =>
      txs
        .filter(tx => tx.type === 'trade' && tx.status === 'complete')
        .map(tx => ({ ...tx, week: Number(weekStr) }))
    )
    .sort((a, b) => b.created - a.created);

  if (!trades.length) return <div className="empty">No trades this season.</div>;

  function formatDate(ms: number) {
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function playerName(pid: string) {
    const p = players?.[pid];
    return p?.full_name ?? p?.last_name ?? `#${pid}`;
  }

  function playerPos(pid: string) {
    return players?.[pid]?.position ?? '?';
  }

  const POS_COLOR: Record<string, string> = {
    QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a', K: '#6b1c6b', DEF: '#444',
  };

  return (
    <div className="trade-history-wrap">
      <div className="trade-history-count">{trades.length} trade{trades.length !== 1 ? 's' : ''} this season</div>
      <div className="trade-history-list">
        {trades.map(trade => {
          const rosterIds = trade.roster_ids;
          const adds = trade.adds ?? {};
          const drops = trade.drops ?? {};

          // For each team: what they received (added to their roster) and gave up (dropped from their roster)
          const sides = rosterIds.map(rid => {
            const received = Object.entries(adds).filter(([, assignedRid]) => assignedRid === rid).map(([pid]) => pid);
            const sentAway = Object.entries(drops).filter(([, fromRid]) => fromRid === rid).map(([pid]) => pid);
            return { rosterId: rid, received, sentAway };
          });

          return (
            <div key={trade.transaction_id} className="trade-card">
              <div className="trade-card-header">
                <span className="trade-week-badge">Week {trade.week}</span>
                <span className="trade-date">{formatDate(trade.created)}</span>
              </div>
              <div className="trade-sides">
                {sides.map((side, idx) => (
                  <div key={side.rosterId} className="trade-side">
                    <div className="trade-side-team">
                      <TeamAvatar rosterId={side.rosterId} rosters={rosters} userMap={userMap} />
                      <span className="trade-team-name">{teamName(side.rosterId, rosters, userMap)}</span>
                    </div>
                    <div className="trade-side-players">
                      {side.received.map(pid => (
                        <span key={pid} className="trade-player trade-player-in">
                          <span className="trade-pos" style={{ background: POS_COLOR[playerPos(pid)] ?? '#888' }}>{playerPos(pid)}</span>
                          {playerName(pid)}
                        </span>
                      ))}
                    </div>
                    {idx < sides.length - 1 && <div className="trade-arrow">⇄</div>}
                  </div>
                ))}
              </div>
              {trade.waiver_budget?.some(wb => wb.amount > 0) && (
                <div className="trade-faab">
                  {trade.waiver_budget.filter(wb => wb.amount > 0).map((wb, i) => (
                    <span key={i} className="trade-faab-chip">
                      {teamName(wb.sender, rosters, userMap)} sends ${wb.amount} FAAB
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
