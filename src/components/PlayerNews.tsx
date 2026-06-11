import { useQuery } from '@tanstack/react-query';
import { getTrendingPlayers, avatarUrl } from '../api/sleeper';
import type { SleeperRoster, SleeperUser, PlayersMap } from '../types/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players?: PlayersMap;
  isLoading: boolean;
}

const POS_COLOR: Record<string, string> = {
  QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a', K: '#6b1c6b', DEF: '#444',
};

const INJURY_COLOR: Record<string, string> = {
  Out: '#c43d2e', Doubtful: '#c43d2e', Questionable: '#b07c08',
  'IR': '#6b1c6b', 'PUP': '#6b1c6b', Probable: '#1c8a4e',
};

export default function PlayerNews({ rosters, userMap, players, isLoading }: Props) {
  const { data: trendingAdds, isLoading: addsLoading } = useQuery({
    queryKey: ['trending-add'],
    queryFn: () => getTrendingPlayers('add', 24, 20),
    staleTime: 30 * 60 * 1000,
  });

  const { data: trendingDrops, isLoading: dropsLoading } = useQuery({
    queryKey: ['trending-drop'],
    queryFn: () => getTrendingPlayers('drop', 24, 20),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading || addsLoading || dropsLoading) return <div className="loading">Loading player news…</div>;

  // Build owned set
  const ownedMap = new Map<string, number>(); // playerId → rosterId
  for (const r of rosters) {
    for (const pid of r.players ?? []) ownedMap.set(pid, r.roster_id);
  }

  function ownerName(pid: string) {
    const rid = ownedMap.get(pid);
    if (!rid) return null;
    const r = rosters.find(x => x.roster_id === rid);
    const u = userMap.get(r?.owner_id ?? '');
    return u?.display_name ?? u?.username ?? null;
  }

  // Injured rostered players
  const injured = rosters.flatMap(r =>
    (r.players ?? [])
      .map(pid => ({ pid, player: players?.[pid], rosterId: r.roster_id }))
      .filter(({ player }) => player?.injury_status && player.injury_status !== 'Probable')
  ).sort((a, b) => {
    const order = ['Out', 'Doubtful', 'IR', 'PUP', 'Questionable'];
    return (order.indexOf(a.player!.injury_status!) ?? 9) - (order.indexOf(b.player!.injury_status!) ?? 9);
  });

  function PlayerChip({ pid, count, mode }: { pid: string; count?: number; mode: 'add' | 'drop' }) {
    const p = players?.[pid];
    const name = p?.full_name ?? p?.last_name ?? `#${pid}`;
    const pos = p?.position ?? '?';
    const team = p?.team ?? '';
    const owner = ownerName(pid);
    return (
      <li className="news-player-row">
        <span className="news-pos" style={{ background: POS_COLOR[pos] ?? '#888' }}>{pos}</span>
        <div className="news-player-info">
          <span className="news-player-name">{name}</span>
          <span className="news-player-meta">{team}{owner ? ` · ${owner}` : ' · Free Agent'}</span>
        </div>
        {count !== undefined && (
          <span className={`news-count news-count-${mode}`}>
            {mode === 'add' ? '+' : '−'}{count.toLocaleString()}
          </span>
        )}
      </li>
    );
  }

  return (
    <div className="news-wrap">
      {/* Injury Report */}
      {injured.length > 0 && (
        <div className="news-section">
          <div className="news-section-title">🏥 Injury Report — Rostered Players</div>
          <ul className="news-list">
            {injured.map(({ pid, player, rosterId }) => {
              const r = rosters.find(x => x.roster_id === rosterId);
              const u = userMap.get(r?.owner_id ?? '');
              const av = u ? avatarUrl(u.avatar) : null;
              const status = player?.injury_status ?? '';
              return (
                <li key={pid} className="news-player-row">
                  <span className="news-pos" style={{ background: POS_COLOR[player?.position ?? ''] ?? '#888' }}>{player?.position ?? '?'}</span>
                  <div className="news-player-info">
                    <span className="news-player-name">{player?.full_name ?? player?.last_name ?? pid}</span>
                    <span className="news-player-meta">{player?.team ?? ''} · {u?.display_name ?? u?.username ?? 'Unknown'}</span>
                  </div>
                  {av && <img src={av} alt="" className="avatar-xs" style={{ marginLeft: 'auto' }} />}
                  <span className="news-injury-badge" style={{ background: INJURY_COLOR[status] ?? '#888' }}>{status}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="news-two-col">
        {/* Trending Adds */}
        <div className="news-section">
          <div className="news-section-title">📈 Trending Adds (24h)</div>
          <ul className="news-list">
            {(trendingAdds ?? []).map(t => (
              <PlayerChip key={t.player_id} pid={t.player_id} count={t.count} mode="add" />
            ))}
          </ul>
        </div>

        {/* Trending Drops */}
        <div className="news-section">
          <div className="news-section-title">📉 Trending Drops (24h)</div>
          <ul className="news-list">
            {(trendingDrops ?? []).map(t => (
              <PlayerChip key={t.player_id} pid={t.player_id} count={t.count} mode="drop" />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
