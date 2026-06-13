import { useQuery } from '@tanstack/react-query';
import { getTrendingPlayers, getEspnNflNews } from '../api/sleeper';
import type { EspnArticle } from '../api/sleeper';
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

const INJURY_ORDER = ['Out', 'Doubtful', 'IR', 'PUP', 'Questionable', 'Probable'];
const INJURY_COLOR: Record<string, string> = {
  Out: 'var(--red)', Doubtful: 'var(--red)', IR: '#6b1c9e', PUP: '#6b1c9e',
  Questionable: 'var(--yellow)', Probable: 'var(--green)',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PlayerNews({ rosters, userMap, players, isLoading }: Props) {
  const { data: trendingAdds, isLoading: addsLoading } = useQuery({
    queryKey: ['trending-add'],
    queryFn: () => getTrendingPlayers('add', 24, 15),
    staleTime: 30 * 60 * 1000,
  });
  const { data: trendingDrops, isLoading: dropsLoading } = useQuery({
    queryKey: ['trending-drop'],
    queryFn: () => getTrendingPlayers('drop', 24, 15),
    staleTime: 30 * 60 * 1000,
  });
  const { data: espnNews, isLoading: newsLoading } = useQuery({
    queryKey: ['espn-nfl-news'],
    queryFn: () => getEspnNflNews(100),
    staleTime: 15 * 60 * 1000,
  });

  if (isLoading || addsLoading || dropsLoading || newsLoading) {
    return <div className="loading">Loading player news…</div>;
  }

  // Build owner lookup
  const ownedMap = new Map<string, { rosterId: number; name: string }>();
  for (const r of rosters) {
    const u = userMap.get(r.owner_id);
    const name = u?.display_name ?? u?.username ?? `Team ${r.roster_id}`;
    for (const pid of r.players ?? []) ownedMap.set(pid, { rosterId: r.roster_id, name });
  }

  // Build ESPN id → articles and name → articles maps
  const espnById = new Map<number, EspnArticle[]>();
  const espnByName = new Map<string, EspnArticle[]>();
  for (const article of espnNews ?? []) {
    for (const id of article.athleteIds) {
      if (!espnById.has(id)) espnById.set(id, []);
      espnById.get(id)!.push(article);
    }
    for (const name of article.athleteNames) {
      if (!espnByName.has(name)) espnByName.set(name, []);
      espnByName.get(name)!.push(article);
    }
  }

  // Collect all rostered player IDs
  const rosteredPids = new Set(rosters.flatMap(r => r.players ?? []));

  // News articles for rostered players
  const rosterNews: { pid: string; article: EspnArticle }[] = [];
  const seenArticleIds = new Set<number>();
  for (const pid of rosteredPids) {
    const player = players?.[pid];
    if (!player) continue;
    const byId = player.espn_id ? (espnById.get(player.espn_id) ?? []) : [];
    const byName = player.full_name ? (espnByName.get(player.full_name.toLowerCase()) ?? []) : [];
    const articles = byId.length ? byId : byName;
    for (const article of articles) {
      if (!seenArticleIds.has(article.id)) {
        seenArticleIds.add(article.id);
        rosterNews.push({ pid, article });
      }
    }
  }
  rosterNews.sort((a, b) => new Date(b.article.published).getTime() - new Date(a.article.published).getTime());

  // Injured rostered players
  const injured = rosters
    .flatMap(r => (r.players ?? []).map(pid => ({ pid, player: players?.[pid] })))
    .filter(({ player }) => player?.injury_status && player.injury_status !== 'Probable')
    .sort((a, b) =>
      (INJURY_ORDER.indexOf(a.player!.injury_status!) ?? 9) -
      (INJURY_ORDER.indexOf(b.player!.injury_status!) ?? 9)
    );

  return (
    <div className="news-wrap">

      {/* Real news for rostered players */}
      {rosterNews.length > 0 && (
        <div className="news-block">
          <div className="news-block-title">Latest News — Your Rosters</div>
          <div className="news-feed">
            {rosterNews.slice(0, 15).map(({ pid, article }) => {
              const player = players?.[pid];
              const pos = player?.position ?? '?';
              const owner = ownedMap.get(pid);
              return (
                <a
                  key={article.id}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-feed-item"
                >
                  <div className="news-feed-meta">
                    <span className="news-pos-badge" style={{ background: POS_COLOR[pos] ?? '#888' }}>{pos}</span>
                    <span className="news-feed-player">{player?.full_name ?? pid}</span>
                    {player?.team && <span className="news-feed-team">{player.team}</span>}
                    {owner && <span className="news-owner">{owner.name}</span>}
                    <span className="news-feed-time">{timeAgo(article.published)}</span>
                  </div>
                  <div className="news-feed-headline">{article.headline}</div>
                  {article.description && (
                    <div className="news-feed-desc">{article.description}</div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Injury Report */}
      {injured.length > 0 && (
        <div className="news-block">
          <div className="news-block-title">Injury Report — Rostered Players</div>
          <div className="news-injury-list">
            {injured.map(({ pid, player }) => {
              const status = player?.injury_status ?? '';
              const pos = player?.position ?? '?';
              const owner = ownedMap.get(pid);
              return (
                <div key={pid} className="news-injury-card">
                  <span className="news-pos-badge" style={{ background: POS_COLOR[pos] ?? '#888' }}>{pos}</span>
                  <div className="news-player-details">
                    <span className="news-player-name">{player?.full_name ?? pid}</span>
                    <span className="news-player-meta">
                      {player?.team ?? '—'}
                      {owner ? <> · <span className="news-owner">{owner.name}</span></> : ' · Unowned'}
                    </span>
                    {player?.injury_notes && (
                      <span className="news-injury-note">{player.injury_notes}</span>
                    )}
                    {player?.practice_description && (
                      <span className="news-injury-note">{player.practice_description}</span>
                    )}
                  </div>
                  <span className="news-status-badge" style={{ color: INJURY_COLOR[status] ?? '#888' }}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trending */}
      <div className="news-trending-grid">
        <div className="news-block">
          <div className="news-block-title">
            <span className="news-trend-icon news-trend-up">↑</span> Trending Adds (24h)
          </div>
          <div className="news-trend-list">
            {(trendingAdds ?? []).map((t, i) => {
              const p = players?.[t.player_id];
              const pos = p?.position ?? '?';
              const owner = ownedMap.get(t.player_id);
              return (
                <div key={t.player_id} className="news-trend-row">
                  <span className="news-trend-rank">{i + 1}</span>
                  <span className="news-pos-badge news-pos-sm" style={{ background: POS_COLOR[pos] ?? '#888' }}>{pos}</span>
                  <div className="news-player-details">
                    <span className="news-player-name">{p?.full_name ?? p?.last_name ?? `#${t.player_id}`}</span>
                    <span className="news-player-meta">
                      {p?.team ?? '—'}
                      {owner ? <> · <span className="news-owner">{owner.name}</span></> : ' · Free Agent'}
                    </span>
                  </div>
                  <span className="news-count news-count-add">+{t.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="news-block">
          <div className="news-block-title">
            <span className="news-trend-icon news-trend-down">↓</span> Trending Drops (24h)
          </div>
          <div className="news-trend-list">
            {(trendingDrops ?? []).map((t, i) => {
              const p = players?.[t.player_id];
              const pos = p?.position ?? '?';
              const owner = ownedMap.get(t.player_id);
              return (
                <div key={t.player_id} className="news-trend-row">
                  <span className="news-trend-rank">{i + 1}</span>
                  <span className="news-pos-badge news-pos-sm" style={{ background: POS_COLOR[pos] ?? '#888' }}>{pos}</span>
                  <div className="news-player-details">
                    <span className="news-player-name">{p?.full_name ?? p?.last_name ?? `#${t.player_id}`}</span>
                    <span className="news-player-meta">
                      {p?.team ?? '—'}
                      {owner ? <> · <span className="news-owner">{owner.name}</span></> : ' · Free Agent'}
                    </span>
                  </div>
                  <span className="news-count news-count-drop">−{t.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
