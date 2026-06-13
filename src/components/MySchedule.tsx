import type { SleeperMatchup, SleeperRoster, SleeperUser } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  userId?: string;
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  currentWeek: number;
  isLoading: boolean;
}

export default function MySchedule({ userId, rosters, userMap, seasonMatchups, currentWeek, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading schedule…</div>;
  if (!seasonMatchups) return <div className="empty">No schedule data available.</div>;

  const myRoster = userId ? rosters.find(r => r.owner_id === userId) : rosters[0];
  if (!myRoster) return <div className="empty">Could not find your roster.</div>;

  const myRosterId = myRoster.roster_id;

  // Build week-by-week results
  const weeks = Object.keys(seasonMatchups)
    .map(Number)
    .sort((a, b) => a - b);

  type WeekResult = {
    week: number;
    myPoints: number;
    oppPoints: number;
    oppRosterId: number | null;
    result: 'W' | 'L' | 'T' | 'upcoming';
    margin: number;
  };

  const results: WeekResult[] = weeks.map(week => {
    const entries = seasonMatchups[week] ?? [];
    const mine = entries.find(e => e.roster_id === myRosterId);
    if (!mine) return null;

    const opp = entries.find(
      e => e.matchup_id === mine.matchup_id && e.roster_id !== myRosterId
    );

    const myPts = mine.points ?? 0;
    const oppPts = opp?.points ?? 0;
    const upcoming = myPts === 0 && oppPts === 0 && week >= currentWeek;

    let result: WeekResult['result'] = 'upcoming';
    if (!upcoming) {
      if (myPts > oppPts) result = 'W';
      else if (myPts < oppPts) result = 'L';
      else result = 'T';
    }

    return {
      week,
      myPoints: myPts,
      oppPoints: oppPts,
      oppRosterId: opp?.roster_id ?? null,
      result,
      margin: Math.abs(myPts - oppPts),
    };
  }).filter(Boolean) as WeekResult[];

  const played = results.filter(r => r.result !== 'upcoming');
  const wins = played.filter(r => r.result === 'W').length;
  const losses = played.filter(r => r.result === 'L').length;
  const pf = played.reduce((s, r) => s + r.myPoints, 0);
  const pa = played.reduce((s, r) => s + r.oppPoints, 0);

  // Streak
  const streakArr = [...played].reverse();
  const streakResult = streakArr[0]?.result;
  let streak = 0;
  for (const r of streakArr) {
    if (r.result === streakResult) streak++;
    else break;
  }
  const streakLabel = streakResult ? `${streak}${streakResult}` : '—';

  const myUser = userMap.get(myRoster.owner_id);

  function oppInfo(rosterId: number | null) {
    if (!rosterId) return { name: 'BYE', avatar: null };
    const r = rosters.find(x => x.roster_id === rosterId);
    const u = r ? userMap.get(r.owner_id) : undefined;
    return {
      name: u?.display_name ?? u?.username ?? `Team ${rosterId}`,
      avatar: u ? avatarUrl(u.avatar) : null,
    };
  }

  return (
    <div className="myschedule-wrap">
      {/* Summary strip */}
      <div className="myschedule-summary">
        <div className="myschedule-me">
          {myUser?.avatar
            ? <img src={avatarUrl(myUser.avatar)!} alt="" className="avatar-sm" />
            : <div className="avatar-sm avatar-placeholder" />}
          <span className="myschedule-me-name">{myUser?.display_name ?? myUser?.username ?? 'My Team'}</span>
        </div>
        <div className="myschedule-stats">
          <div className="myschedule-stat">
            <span className="myschedule-stat-val">{wins}-{losses}</span>
            <span className="myschedule-stat-lbl">Record</span>
          </div>
          <div className="myschedule-stat">
            <span className="myschedule-stat-val">{pf.toFixed(1)}</span>
            <span className="myschedule-stat-lbl">PF</span>
          </div>
          <div className="myschedule-stat">
            <span className="myschedule-stat-val">{pa.toFixed(1)}</span>
            <span className="myschedule-stat-lbl">PA</span>
          </div>
          <div className="myschedule-stat">
            <span className="myschedule-stat-val">{streakLabel}</span>
            <span className="myschedule-stat-lbl">Streak</span>
          </div>
        </div>
      </div>

      {/* Week rows */}
      <div className="myschedule-list">
        {results.map(row => {
          const opp = oppInfo(row.oppRosterId);
          const isCurrent = row.week === currentWeek;
          const isClose = row.result !== 'upcoming' && row.margin < 10;
          return (
            <div
              key={row.week}
              className={`myschedule-row ${row.result === 'W' ? 'ms-win' : row.result === 'L' ? 'ms-loss' : row.result === 'upcoming' ? 'ms-upcoming' : ''} ${isCurrent ? 'ms-current' : ''}`}
            >
              <div className="ms-week-badge">
                <span className="ms-week-num">Wk {row.week}</span>
                {isCurrent && <span className="ms-now-dot" />}
              </div>

              <div className="ms-opp">
                {opp.avatar
                  ? <img loading="lazy" src={opp.avatar} alt="" className="avatar-xs" />
                  : <div className="avatar-xs avatar-placeholder" />}
                <span className="ms-opp-name">{opp.name}</span>
              </div>

              <div className="ms-right">
                {row.result !== 'upcoming' && (
                  <>
                    <span className="ms-score">{row.myPoints.toFixed(1)} – {row.oppPoints.toFixed(1)}</span>
                    {isClose && <span className="ms-close-badge">Close</span>}
                  </>
                )}
                {row.result === 'upcoming' && <span className="ms-upcoming-label">Upcoming</span>}
                <span className={`ms-result-badge ms-${row.result}`}>
                  {row.result === 'upcoming' ? '' : row.result}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
