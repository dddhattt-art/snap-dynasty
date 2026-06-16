import { useQuery } from '@tanstack/react-query';
import { getPlayerStats, playerFullImg, teamLogoUrl, getEspnNflNews } from '../api/sleeper';
import type { EspnArticle } from '../api/sleeper';
import type { PlayersMap } from '../types/sleeper';
import { useState } from 'react';

interface Props {
  playerId: string | null;
  players: PlayersMap | undefined;
  onClose: () => void;
}

const POS_COLOR: Record<string, string> = {
  QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a',
  K: '#6b1c6b', DEF: '#1a5fa8',
};

const STAT_LABELS: Record<string, string> = {
  pass_yd: 'Pass Yds', pass_td: 'Pass TDs', pass_int: 'INTs', pass_att: 'Att', pass_cmp: 'Comp',
  rush_yd: 'Rush Yds', rush_td: 'Rush TDs', rush_att: 'Carries',
  rec: 'Receptions', rec_yd: 'Rec Yds', rec_td: 'Rec TDs', rec_tgt: 'Targets',
  fgm: 'FG Made', fga: 'FG Att', xpm: 'XP Made',
  pts_allow: 'Pts Allowed', sack: 'Sacks', def_int: 'DEF INTs', def_td: 'Def TDs', safe: 'Safeties',
  pts_ppr: 'PPR Pts', pts_std: 'Std Pts', pts_half_ppr: 'Half PPR',
  gp: 'Games', bonus_rec_te: 'TE Bonus',
};

const POS_STATS: Record<string, string[]> = {
  QB:  ['pts_ppr', 'pass_yd', 'pass_td', 'pass_int', 'pass_att', 'pass_cmp', 'rush_yd', 'rush_td'],
  RB:  ['pts_ppr', 'rush_yd', 'rush_td', 'rush_att', 'rec', 'rec_yd', 'rec_td', 'rec_tgt'],
  WR:  ['pts_ppr', 'rec', 'rec_yd', 'rec_td', 'rec_tgt', 'rush_yd'],
  TE:  ['pts_ppr', 'rec', 'rec_yd', 'rec_td', 'rec_tgt'],
  K:   ['pts_ppr', 'fgm', 'fga', 'xpm'],
  DEF: ['pts_ppr', 'pts_allow', 'sack', 'def_int', 'def_td', 'safe'],
};

// Keys we never want to show (noise / internal)
const STAT_BLACKLIST = new Set(['player_id', 'week', 'season', 'team', 'company']);

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function lastCompletedSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  // NFL season runs Sept–Jan; before September the current year's season hasn't started
  return (now.getMonth() < 8 ? year - 1 : year).toString();
}

export default function PlayerPanel({ playerId, players, onClose }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const player = playerId ? players?.[playerId] : null;
  const statsSeason = lastCompletedSeason();

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['player-stats', playerId, statsSeason],
    queryFn: () => getPlayerStats(playerId!, statsSeason),
    enabled: !!playerId,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const { data: espnNews } = useQuery<EspnArticle[]>({
    queryKey: ['espn-nfl-news'],
    queryFn: () => getEspnNflNews(),
    staleTime: 15 * 60 * 1000,
  });

  const playerNews = (espnNews ?? []).filter((a: EspnArticle) =>
    (player?.espn_id && a.athleteIds.includes(player.espn_id)) ||
    (player?.full_name && a.athleteNames.includes(player.full_name.toLowerCase()))
  ).slice(0, 4);

  if (!playerId || !player) return null;

  const pos = player.position ?? '?';
  const color = POS_COLOR[pos] ?? '#64748b';
  const hasStats = stats && Object.keys(stats).length > 0;

  // Build display stat list: preferred keys first, then fall back to all non-zero numeric stats
  const preferredKeys = POS_STATS[pos] ?? ['pts_ppr'];
  const matchedKeys = preferredKeys.filter(k => stats?.[k] != null && stats[k] !== 0);
  const displayStats = matchedKeys.length > 0
    ? matchedKeys
    : Object.keys(stats ?? {})
        .filter(k => !STAT_BLACKLIST.has(k) && typeof stats![k] === 'number' && stats![k] !== 0)
        .sort((a, b) => (stats![b] as number) - (stats![a] as number))
        .slice(0, 9);

  const injuryColor: Record<string, string> = {
    Out: '#dc2626', Doubtful: '#ea580c', Questionable: '#d97706', IR: '#7c3aed',
  };

  return (
    <>
      <div className="pp-overlay" onClick={onClose} />
      <div className="pp-panel">
        <button className="pp-close" onClick={onClose} aria-label="Close">
          <i className="ti ti-x" />
        </button>

        {/* Header */}
        <div className="pp-header" style={{ borderTop: `4px solid ${color}` }}>
          <div className="pp-img-wrap">
            {!imgFailed ? (
              <img
                src={pos === 'DEF' && player.team ? teamLogoUrl(player.team) : playerFullImg(playerId)}
                alt=""
                className="pp-img"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="pp-img-fallback" style={{ background: color + '18', color }}>
                {pos}
              </div>
            )}
          </div>
          <div className="pp-identity">
            <div className="pp-name">{player.full_name ?? player.last_name ?? playerId}</div>
            <div className="pp-meta-row">
              <span className="pp-pos-badge" style={{ background: color + '18', color }}>{pos}</span>
              {player.team && <span className="pp-team">{player.team}</span>}
              {player.injury_status && (
                <span className="pp-injury" style={{ color: injuryColor[player.injury_status] ?? '#64748b' }}>
                  <i className="ti ti-alert-circle" /> {player.injury_status}
                </span>
              )}
            </div>
            <div className="pp-bio">
              {player.age && <span>{player.age} yrs</span>}
              {player.years_exp != null && <span>{player.years_exp === 0 ? 'Rookie' : `Yr ${player.years_exp + 1}`}</span>}
              {player.college && <span>{player.college}</span>}
            </div>
          </div>
        </div>

        {/* Season stats */}
        <div className="pp-section">
          <div className="pp-section-title">{statsSeason} Season Stats</div>
          {statsLoading ? (
            <div className="pp-loading">Loading stats…</div>
          ) : statsError ? (
            <div className="pp-empty">Stats unavailable for this player.</div>
          ) : !hasStats ? (
            <div className="pp-empty">No {season} stats found.</div>
          ) : displayStats.length === 0 ? (
            <div className="pp-empty">No scoring stats recorded.</div>
          ) : (
            <div className="pp-stats-grid">
              {displayStats.map(key => (
                <div key={key} className="pp-stat-card">
                  <div className="pp-stat-val">
                    {Number.isInteger(stats![key]) ? stats![key] : (stats![key] as number).toFixed(1)}
                  </div>
                  <div className="pp-stat-lbl">{STAT_LABELS[key] ?? key}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Injury notes */}
        {player.injury_notes && (
          <div className="pp-section">
            <div className="pp-section-title">Injury Report</div>
            <div className="pp-injury-notes">{player.injury_notes}</div>
          </div>
        )}

        {/* News */}
        <div className="pp-section">
          <div className="pp-section-title">Recent News</div>
          {playerNews.length === 0 ? (
            <div className="pp-empty">No recent news.</div>
          ) : (
            <div className="pp-news-list">
              {playerNews.map((a: EspnArticle) => (
                <a key={a.link} href={a.link} target="_blank" rel="noopener noreferrer" className="pp-news-item">
                  <div className="pp-news-headline">{a.headline}</div>
                  <div className="pp-news-desc">{a.description}</div>
                  <div className="pp-news-time">{timeAgo(a.published)}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
