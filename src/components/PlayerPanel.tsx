import { useQuery } from '@tanstack/react-query';
import { getPlayerWeeklyStats, playerFullImg, teamLogoUrl, getEspnNflNews } from '../api/sleeper';
import type { EspnArticle } from '../api/sleeper';
import type { PlayersMap } from '../types/sleeper';
import { useState } from 'react';
import type { SalaryMap } from '../hooks/useSalaries';

interface Props {
  playerId: string | null;
  players: PlayersMap | undefined;
  onClose: () => void;
  salaries?: SalaryMap;
  setSalary?: (playerId: string, amount: number) => void;
}

const POS_COLOR: Record<string, string> = {
  QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a',
  K: '#6b1c6b', DEF: '#1a5fa8',
};

const STAT_LABELS: Record<string, string> = {
  pass_yd: 'Pass Yds', pass_td: 'Pass TDs', pass_int: 'INTs', pass_att: 'Att', pass_cmp: 'Comp',
  rush_yd: 'Rush Yds', rush_td: 'Rush TDs', rush_att: 'Carries',
  rec: 'Rec', rec_yd: 'Rec Yds', rec_td: 'Rec TDs', rec_tgt: 'Tgts',
  fgm: 'FG Made', fga: 'FG Att', xpm: 'XP Made',
  pts_allow: 'Pts Allow', sack: 'Sacks', def_int: 'INTs', def_td: 'Def TDs', safe: 'Safeties',
  pts_ppr: 'PPR Pts', pts_std: 'Std Pts', pts_half_ppr: 'Half PPR',
};

// Which stats to show in the season totals grid per position
const POS_STATS: Record<string, string[]> = {
  QB:  ['pts_ppr', 'pass_yd', 'pass_td', 'pass_int', 'pass_cmp', 'pass_att', 'rush_yd', 'rush_td'],
  RB:  ['pts_ppr', 'rush_yd', 'rush_td', 'rush_att', 'rec', 'rec_yd', 'rec_td', 'rec_tgt'],
  WR:  ['pts_ppr', 'rec', 'rec_yd', 'rec_td', 'rec_tgt'],
  TE:  ['pts_ppr', 'rec', 'rec_yd', 'rec_td', 'rec_tgt'],
  K:   ['pts_ppr', 'fgm', 'fga', 'xpm'],
  DEF: ['pts_ppr', 'pts_allow', 'sack', 'def_int', 'def_td', 'safe'],
};

// Which stats to show in the weekly row per position
const POS_WEEKLY: Record<string, string[]> = {
  QB:  ['pts_ppr', 'pass_yd', 'pass_td', 'rush_yd'],
  RB:  ['pts_ppr', 'rush_yd', 'rush_td', 'rec', 'rec_yd'],
  WR:  ['pts_ppr', 'rec', 'rec_yd', 'rec_td'],
  TE:  ['pts_ppr', 'rec', 'rec_yd', 'rec_td'],
  K:   ['pts_ppr', 'fgm', 'xpm'],
  DEF: ['pts_ppr', 'sack', 'def_int'],
};

function lastCompletedSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() < 8 ? year - 1 : year;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PlayerPanel({ playerId, players, onClose, salaries, setSalary }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState('');
  const player = playerId ? players?.[playerId] : null;
  const primarySeason = lastCompletedSeason();
  const fallbackSeason = primarySeason - 1;

  const { data: primaryWeeks, isLoading: primaryLoading } = useQuery({
    queryKey: ['player-weekly', playerId, primarySeason],
    queryFn: () => getPlayerWeeklyStats(playerId!, String(primarySeason)),
    enabled: !!playerId,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const primaryEmpty = !primaryLoading && (!primaryWeeks || primaryWeeks.length === 0);

  const { data: fallbackWeeks, isLoading: fallbackLoading } = useQuery({
    queryKey: ['player-weekly', playerId, fallbackSeason],
    queryFn: () => getPlayerWeeklyStats(playerId!, String(fallbackSeason)),
    enabled: !!playerId && primaryEmpty,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const weeks = primaryEmpty ? (fallbackWeeks ?? []) : (primaryWeeks ?? []);
  const statsSeason = primaryEmpty ? fallbackSeason : primarySeason;
  const statsLoading = primaryLoading || (primaryEmpty && fallbackLoading);

  // Aggregate weekly data into season totals
  const seasonTotals: Record<string, number> = {};
  for (const { stats } of weeks) {
    for (const [k, v] of Object.entries(stats)) {
      if (typeof v === 'number') seasonTotals[k] = (seasonTotals[k] ?? 0) + v;
    }
  }

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
  const hasStats = weeks.length > 0;
  const displayKeys = (POS_STATS[pos] ?? ['pts_ppr']).filter(k => seasonTotals[k] != null && seasonTotals[k] !== 0);
  const weeklyKeys = POS_WEEKLY[pos] ?? ['pts_ppr'];

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
              <div className="pp-img-fallback" style={{ background: color + '18', color }}>{pos}</div>
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
            {setSalary && (
              <div className="pp-salary-row">
                {editingSalary ? (
                  <form
                    className="pp-salary-edit"
                    onSubmit={e => {
                      e.preventDefault();
                      const val = parseFloat(salaryInput);
                      if (!isNaN(val) && val >= 0) setSalary(playerId, val);
                      setEditingSalary(false);
                    }}
                  >
                    <span className="pp-salary-dollar">$</span>
                    <input
                      className="pp-salary-input"
                      type="number"
                      min="0"
                      step="0.1"
                      autoFocus
                      value={salaryInput}
                      onChange={e => setSalaryInput(e.target.value)}
                      onBlur={() => setEditingSalary(false)}
                    />
                    <button type="submit" className="pp-salary-save">Save</button>
                  </form>
                ) : (
                  <button
                    className="pp-salary-badge"
                    onClick={() => { setSalaryInput(String(salaries?.[playerId] ?? '')); setEditingSalary(true); }}
                  >
                    {salaries?.[playerId] != null
                      ? `$${salaries[playerId].toLocaleString()}`
                      : '+ Set Salary'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Season totals */}
        <div className="pp-section">
          <div className="pp-section-title">{statsSeason} Season Totals</div>
          {statsLoading ? (
            <div className="pp-loading">Loading stats…</div>
          ) : !hasStats ? (
            <div className="pp-empty">No {statsSeason} stats available.</div>
          ) : (
            <div className="pp-stats-grid">
              {displayKeys.map(key => (
                <div key={key} className="pp-stat-card">
                  <div className="pp-stat-val">{fmt(seasonTotals[key])}</div>
                  <div className="pp-stat-lbl">{STAT_LABELS[key] ?? key}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly breakdown */}
        {hasStats && (
          <div className="pp-section">
            <div className="pp-section-title">Week by Week</div>
            <div className="pp-week-table">
              <div className="pp-week-header">
                <span>Wk</span>
                {weeklyKeys.map(k => <span key={k}>{STAT_LABELS[k] ?? k}</span>)}
              </div>
              {weeks.map(({ week, stats }) => (
                <div key={week} className={`pp-week-row ${(stats.pts_ppr ?? 0) >= 20 ? 'pp-week-hot' : ''}`}>
                  <span className="pp-week-num">{week}</span>
                  {weeklyKeys.map(k => (
                    <span key={k} className="pp-week-cell">
                      {stats[k] != null ? fmt(stats[k]) : '—'}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

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
