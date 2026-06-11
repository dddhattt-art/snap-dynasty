import { useState } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup, SleeperBracketMatch, SleeperLeague, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface SeasonData {
  league: SleeperLeague;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  bracket: SleeperBracketMatch[];
}

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  players?: PlayersMap;
  season?: string;
  history?: SeasonData[];
  allTimeMatchups?: Record<string, Record<number, SleeperMatchup[]>>;
  isLoading: boolean;
}

interface GameEntry {
  week: number;
  season?: string;
  rosterId: number;
  pts: number;
  oppId: number;
  oppPts: number;
  margin: number;
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
}

function teamName(rosterId: number, rosters: SleeperRoster[], userMap: Map<string, SleeperUser>): string {
  const r = rosters.find(x => x.roster_id === rosterId);
  const u = userMap.get(r?.owner_id ?? '');
  return u?.display_name ?? u?.username ?? `Team ${rosterId}`;
}

function TeamAvatar({ rosterId, rosters, userMap, size = 'avatar-xs' }: {
  rosterId: number; rosters: SleeperRoster[]; userMap: Map<string, SleeperUser>; size?: string;
}) {
  const r = rosters.find(x => x.roster_id === rosterId);
  const u = userMap.get(r?.owner_id ?? '');
  const av = u ? avatarUrl(u.avatar) : null;
  return av ? <img src={av} alt="" className={size} /> : null;
}

function MatchupDetail({ entry, seasonMatchups, players }: {
  entry: GameEntry;
  seasonMatchups: Record<number, SleeperMatchup[]>;
  players?: PlayersMap;
}) {
  const { rosters, userMap } = entry;
  const weekMatchups = seasonMatchups[entry.week] ?? [];
  const a = weekMatchups.find(m => m.roster_id === entry.rosterId);
  const b = weekMatchups.find(m => m.roster_id === entry.oppId);
  if (!a || !b) return <div className="record-detail-empty">Matchup data unavailable.</div>;

  const aWins = a.points > b.points;
  const bWins = b.points > a.points;

  function StarterRows({ matchup }: { matchup: SleeperMatchup }) {
    const starters = matchup.starters ?? [];
    const pts = matchup.players_points ?? {};
    if (!starters.length) return null;
    return (
      <ul className="record-starters">
        {starters.map(pid => {
          const p = players?.[pid];
          const name = p?.full_name ?? p?.last_name ?? pid;
          const pos = p?.position ?? '—';
          const score = pts[pid] ?? 0;
          return (
            <li key={pid} className="record-starter-row">
              <span className="record-starter-pos">{pos}</span>
              <span className="record-starter-name">{name}</span>
              <span className="record-starter-pts">{score.toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="record-detail">
      <div className="record-detail-header">
        Week {entry.week}{entry.season ? ` · ${entry.season}` : ''}
      </div>
      <div className="record-detail-matchup">
        <div className={`record-detail-side ${aWins ? 'record-winner' : ''}`}>
          <TeamAvatar rosterId={a.roster_id} rosters={rosters} userMap={userMap} size="avatar-sm" />
          <div className="record-detail-team">{teamName(a.roster_id, rosters, userMap)}</div>
          <div className="record-detail-score">{a.points.toFixed(2)}</div>
          <StarterRows matchup={a} />
        </div>
        <div className="record-detail-vs">vs</div>
        <div className={`record-detail-side ${bWins ? 'record-winner' : ''}`}>
          <TeamAvatar rosterId={b.roster_id} rosters={rosters} userMap={userMap} size="avatar-sm" />
          <div className="record-detail-team">{teamName(b.roster_id, rosters, userMap)}</div>
          <div className="record-detail-score">{b.points.toFixed(2)}</div>
          <StarterRows matchup={b} />
        </div>
      </div>
    </div>
  );
}

function RecordSection({ title, entries, allTimeMatchups, currentSeasonMatchups, players, scoreKey, label }: {
  title: string;
  entries: GameEntry[];
  allTimeMatchups?: Record<string, Record<number, SleeperMatchup[]>>;
  currentSeasonMatchups?: Record<number, SleeperMatchup[]>;
  currentSeason?: string;
  players?: PlayersMap;
  scoreKey: 'pts' | 'margin';
  label: string;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  function matchupsForEntry(e: GameEntry): Record<number, SleeperMatchup[]> {
    if (allTimeMatchups && e.season) return allTimeMatchups[e.season] ?? {};
    return currentSeasonMatchups ?? {};
  }

  return (
    <div className="records-section">
      <h4 className="roster-section-title">{title}</h4>
      <ul className="records-list">
        {entries.map((e, i) => (
          <li key={i}>
            <div
              className={`records-row clickable ${expanded === i ? 'records-row-active' : ''}`}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <span className="records-rank">{i + 1}</span>
              <TeamAvatar rosterId={e.rosterId} rosters={e.rosters} userMap={e.userMap} />
              <span className="records-team">{teamName(e.rosterId, e.rosters, e.userMap)}</span>
              <span className="records-vs">vs {teamName(e.oppId, e.rosters, e.userMap)}</span>
              <span className="records-wk">Wk {e.week}{e.season ? ` · ${e.season}` : ''}</span>
              <span className="records-score">
                {scoreKey === 'pts' ? e.pts.toFixed(2) : `+${e.margin.toFixed(2)}`}
                {' '}<span className="tx-date">{label}</span>
              </span>
              <span className="records-chevron">{expanded === i ? '▲' : '▼'}</span>
            </div>
            {expanded === i && (
              <MatchupDetail
                entry={e}
                seasonMatchups={matchupsForEntry(e)}
                players={players}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildGames(
  matchupsBySeason: Record<string, Record<number, SleeperMatchup[]>>,
  seasonDataList: { season: string; rosters: SleeperRoster[]; userMap: Map<string, SleeperUser> }[]
): GameEntry[] {
  const games: GameEntry[] = [];
  for (const { season, rosters, userMap } of seasonDataList) {
    const weekMap = matchupsBySeason[season];
    if (!weekMap) continue;
    for (const [weekStr, matchups] of Object.entries(weekMap)) {
      const week = Number(weekStr);
      const ids = new Set(matchups.map(m => m.matchup_id));
      for (const mid of ids) {
        const pair = matchups.filter(m => m.matchup_id === mid);
        if (pair.length !== 2) continue;
        const [a, b] = pair;
        const margin = Math.abs(a.points - b.points);
        games.push({ week, season, rosterId: a.roster_id, pts: a.points, oppId: b.roster_id, oppPts: b.points, margin, rosters, userMap });
        games.push({ week, season, rosterId: b.roster_id, pts: b.points, oppId: a.roster_id, oppPts: a.points, margin, rosters, userMap });
      }
    }
  }
  return games;
}

export default function SeasonRecords({ rosters, userMap, seasonMatchups, players, season, history, allTimeMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading season records…</div>;
  if (!seasonMatchups || !rosters.length) return <div className="empty">No season data yet.</div>;

  const isAllTime = !!(allTimeMatchups && history?.length);

  let games: GameEntry[];
  if (isAllTime) {
    const seasonDataList = history!.map(h => ({
      season: h.league.season,
      rosters: h.rosters,
      userMap: new Map<string, SleeperUser>(h.users.map(u => [u.user_id, u])),
    }));
    games = buildGames(allTimeMatchups!, seasonDataList);
  } else {
    games = [];
    for (const [weekStr, matchups] of Object.entries(seasonMatchups)) {
      const week = Number(weekStr);
      const ids = new Set(matchups.map(m => m.matchup_id));
      for (const mid of ids) {
        const pair = matchups.filter(m => m.matchup_id === mid);
        if (pair.length !== 2) continue;
        const [a, b] = pair;
        const margin = Math.abs(a.points - b.points);
        games.push({ week, season, rosterId: a.roster_id, pts: a.points, oppId: b.roster_id, oppPts: b.points, margin, rosters, userMap });
        games.push({ week, season, rosterId: b.roster_id, pts: b.points, oppId: a.roster_id, oppPts: a.points, margin, rosters, userMap });
      }
    }
  }

  const topScores  = [...games].sort((a, b) => b.pts - a.pts).slice(0, 5);
  const lowScores  = [...games].filter(g => g.pts > 0).sort((a, b) => a.pts - b.pts).slice(0, 5);
  const bigWins    = [...games].filter(g => g.pts > g.oppPts).sort((a, b) => b.margin - a.margin).slice(0, 5);
  const closeGames = [...games].filter(g => g.pts > g.oppPts).sort((a, b) => a.margin - b.margin).slice(0, 5);

  const sectionProps = { allTimeMatchups, currentSeasonMatchups: seasonMatchups, currentSeason: season, players };

  return (
    <div className="records-wrap">
      {isAllTime && <p className="records-scope">All-time records across {history!.length} season{history!.length !== 1 ? 's' : ''}</p>}
      <RecordSection title="🏆 Highest Single-Week Scores" entries={topScores} {...sectionProps} scoreKey="pts" label="pts" />
      <RecordSection title="📉 Lowest Single-Week Scores" entries={lowScores} {...sectionProps} scoreKey="pts" label="pts" />
      <RecordSection title="💪 Biggest Wins (by margin)" entries={bigWins} {...sectionProps} scoreKey="margin" label="margin" />
      <RecordSection title="😰 Closest Wins" entries={closeGames} {...sectionProps} scoreKey="margin" label="margin" />
    </div>
  );
}
