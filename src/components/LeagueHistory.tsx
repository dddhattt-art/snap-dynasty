import type { SleeperLeague, SleeperRoster, SleeperUser, SleeperBracketMatch } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface SeasonData {
  league: SleeperLeague;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  bracket: SleeperBracketMatch[];
}

interface Props {
  history: SeasonData[] | undefined;
  isLoading: boolean;
}

function getChampionRosterId(bracket: SleeperBracketMatch[]): number | null {
  if (!bracket.length) return null;
  const maxRound = Math.max(...bracket.map(m => m.r));
  const final = bracket.find(m => m.r === maxRound);
  return final?.w ?? null;
}

export default function LeagueHistory({ history, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading league history…</div>;
  if (!history?.length) return <div className="empty">No history available.</div>;

  const allUserIds = new Set<string>();
  for (const season of history) {
    for (const u of season.users) allUserIds.add(u.user_id);
  }

  const latestUserMap = new Map<string, SleeperUser>();
  for (const season of history) {
    for (const u of season.users) latestUserMap.set(u.user_id, u);
  }

  interface CareerStat {
    userId: string;
    wins: number;
    losses: number;
    championships: number;
    playoffApps: number;
    seasons: number;
    seasonResults: { season: string; rank: number; wins: number; losses: number; champion: boolean }[];
  }

  const career = new Map<string, CareerStat>();
  for (const uid of allUserIds) {
    career.set(uid, { userId: uid, wins: 0, losses: 0, championships: 0, playoffApps: 0, seasons: 0, seasonResults: [] });
  }

  for (const { league, rosters, bracket } of history) {
    const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));
    const champRosterId = getChampionRosterId(bracket);
    const champOwnerId = champRosterId ? rosterOwner.get(champRosterId) : null;

    const playoffSpots = league.settings.playoff_teams ?? Math.floor(rosters.length / 2);

    const sorted = [...rosters].sort((a, b) => {
      const wd = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
      const pfa = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100;
      const pfb = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100;
      return wd !== 0 ? wd : pfb - pfa;
    });

    for (const roster of rosters) {
      const ownerId = rosterOwner.get(roster.roster_id);
      if (!ownerId) continue;
      const c = career.get(ownerId);
      if (!c) continue;
      const rank = sorted.findIndex(r => r.roster_id === roster.roster_id) + 1;
      const isChamp = ownerId === champOwnerId;
      const isPlayoff = rank <= playoffSpots;

      c.wins += roster.settings.wins ?? 0;
      c.losses += roster.settings.losses ?? 0;
      if (isChamp) c.championships++;
      if (isPlayoff) c.playoffApps++;
      c.seasons++;
      c.seasonResults.push({
        season: league.season,
        rank,
        wins: roster.settings.wins ?? 0,
        losses: roster.settings.losses ?? 0,
        champion: isChamp,
      });
    }
  }

  const rows = [...career.values()]
    .filter(c => c.seasons > 0)
    .sort((a, b) => b.championships - a.championships || b.wins - a.wins);

  const seasons = history.map(h => h.league.season).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="history-wrap">
      <h4 className="roster-section-title" style={{ marginBottom: '1rem' }}>All-Time Career Stats</h4>
      <table className="standings-table">
        <thead>
          <tr>
            <th>Manager</th>
            <th>Seasons</th>
            <th>Career W-L</th>
            <th>Win %</th>
            <th>🏆</th>
            <th>Playoff Apps</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c => {
            const user = latestUserMap.get(c.userId);
            const av = user ? avatarUrl(user.avatar) : null;
            const winPct = c.wins + c.losses > 0 ? ((c.wins / (c.wins + c.losses)) * 100).toFixed(1) : '0.0';
            return (
              <tr key={c.userId}>
                <td className="team-cell">
                  {av && <img src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? c.userId}</span>
                </td>
                <td>{c.seasons}</td>
                <td>{c.wins}-{c.losses}</td>
                <td>{winPct}%</td>
                <td>{c.championships > 0 ? `${'🏆'.repeat(Math.min(c.championships, 3))} ${c.championships > 3 ? `×${c.championships}` : ''}` : '—'}</td>
                <td>{c.playoffApps}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h4 className="roster-section-title" style={{ margin: '2rem 0 1rem' }}>Season-by-Season Results</h4>
      <div className="history-grid">
        {seasons.map(season => {
          const data = history.find(h => h.league.season === season);
          if (!data) return null;
          const rosterOwner = new Map(data.rosters.map(r => [r.roster_id, r.owner_id]));
          const champRosterId = getChampionRosterId(data.bracket);
          const champOwnerId = champRosterId ? rosterOwner.get(champRosterId) : null;

          const sorted = [...data.rosters].sort((a, b) => {
            const wd = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
            const pfa = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100;
            const pfb = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100;
            return wd !== 0 ? wd : pfb - pfa;
          });

          return (
            <div key={season} className="history-season">
              <div className="history-season-title">{season} Season</div>
              <ul className="history-season-list">
                {sorted.map((roster, i) => {
                  const ownerId = rosterOwner.get(roster.roster_id);
                  const user = data.users.find(u => u.user_id === ownerId);
                  const av = user ? avatarUrl(user.avatar) : null;
                  const isChamp = ownerId === champOwnerId;
                  return (
                    <li key={roster.roster_id} className="history-season-row">
                      <span className="rank">{i + 1}</span>
                      {av && <img src={av} alt="" className="avatar-xs" />}
                      <span className={isChamp ? 'history-champ' : ''}>
                        {isChamp && '🏆 '}{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}
                      </span>
                      <span className="tx-date" style={{ marginLeft: 'auto' }}>
                        {roster.settings.wins ?? 0}-{roster.settings.losses ?? 0}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
