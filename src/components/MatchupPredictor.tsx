import { useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup, SleeperLeague } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  league?: SleeperLeague;
  isLoading: boolean;
}

function teamName(r: SleeperRoster, userMap: Map<string, SleeperUser>) {
  const u = userMap.get(r.owner_id);
  return u?.display_name ?? u?.username ?? `Team ${r.roster_id}`;
}

function winProb(avgA: number, avgB: number, stdA: number, stdB: number): number {
  const diff = avgA - avgB;
  const combinedStd = Math.sqrt(stdA ** 2 + stdB ** 2) || 1;
  // Approximate normal CDF
  const z = diff / combinedStd;
  return 1 / (1 + Math.exp(-1.7 * z));
}

export default function MatchupPredictor({ rosters, userMap, seasonMatchups, league, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading predictor…</div>;
  if (!seasonMatchups) return <div className="empty">No season data yet.</div>;

  const currentWeek = league?.settings?.leg ?? 1;
  const LOOKBACK = 4;

  const teamStats = useMemo(() => {
    const stats = new Map<number, { scores: number[] }>();
    for (const r of rosters) stats.set(r.roster_id, { scores: [] });

    const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);
    const recentWeeks = weeks.slice(-LOOKBACK);

    for (const w of recentWeeks) {
      for (const m of seasonMatchups[w] ?? []) {
        if (m.points > 0) stats.get(m.roster_id)?.scores.push(m.points);
      }
    }
    return stats;
  }, [seasonMatchups, rosters]);

  function avg(scores: number[]) {
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }
  function std(scores: number[]) {
    const mean = avg(scores);
    return scores.length > 1
      ? Math.sqrt(scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length)
      : 20;
  }

  // Get this week's matchup pairs from latest week or current week
  const predWeek = currentWeek;
  const weekMatchups = seasonMatchups[predWeek] ?? seasonMatchups[Math.max(...Object.keys(seasonMatchups).map(Number))] ?? [];

  const pairs = new Map<number, SleeperMatchup[]>();
  for (const m of weekMatchups) {
    const group = pairs.get(m.matchup_id) ?? [];
    group.push(m);
    pairs.set(m.matchup_id, group);
  }

  const predictions = [...pairs.values()]
    .filter(p => p.length === 2)
    .map(([a, b]) => {
      const rA = rosters.find(r => r.roster_id === a.roster_id)!;
      const rB = rosters.find(r => r.roster_id === b.roster_id)!;
      const scoresA = teamStats.get(a.roster_id)?.scores ?? [];
      const scoresB = teamStats.get(b.roster_id)?.scores ?? [];
      const avgA = avg(scoresA);
      const avgB = avg(scoresB);
      const stdA = std(scoresA);
      const stdB = std(scoresB);
      const probA = winProb(avgA, avgB, stdA, stdB);
      const liveA = a.points;
      const liveB = b.points;
      const hasLive = liveA > 0 || liveB > 0;
      return { a, b, rA, rB, avgA, avgB, probA, liveA, liveB, hasLive };
    })
    .sort((x, y) => Math.abs(y.probA - 0.5) - Math.abs(x.probA - 0.5));

  return (
    <div className="predictor-wrap">
      <p className="predictor-note">
        Projections based on each team's last {LOOKBACK} weeks. Live scores shown where available.
      </p>

      {predictions.map(({ a, rA, rB, avgA, avgB, probA, liveA, liveB, hasLive }) => {
        const uA = userMap.get(rA.owner_id);
        const uB = userMap.get(rB.owner_id);
        const avA = uA ? avatarUrl(uA.avatar) : null;
        const avB = uB ? avatarUrl(uB.avatar) : null;
        const probB = 1 - probA;
        const favored = probA >= probB ? 'a' : 'b';

        return (
          <div key={a.matchup_id} className="predictor-card">
            <div className="predictor-teams">
              {/* Team A */}
              <div className={`predictor-side ${favored === 'a' ? 'predictor-favored' : ''}`}>
                {avA && <img src={avA} alt="" className="avatar-sm" />}
                <div className="predictor-team-info">
                  <span className="predictor-team-name">{teamName(rA, userMap)}</span>
                  <span className="predictor-avg">avg {avgA.toFixed(1)}</span>
                </div>
                <div className="predictor-scores">
                  {hasLive && <span className="predictor-live">{liveA.toFixed(2)}</span>}
                  <span className="predictor-proj">{avgA.toFixed(1)} proj</span>
                </div>
              </div>

              {/* VS + prob bar */}
              <div className="predictor-middle">
                <span className="predictor-vs">vs</span>
                <div className="predictor-prob-bar">
                  <div className="predictor-prob-fill-a" style={{ width: `${probA * 100}%` }} />
                </div>
                <div className="predictor-prob-labels">
                  <span style={{ color: 'var(--green)' }}>{(probA * 100).toFixed(0)}%</span>
                  <span style={{ color: 'var(--text-dim)' }}>{(probB * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Team B */}
              <div className={`predictor-side right ${favored === 'b' ? 'predictor-favored' : ''}`}>
                <div className="predictor-scores">
                  {hasLive && <span className="predictor-live">{liveB.toFixed(2)}</span>}
                  <span className="predictor-proj">{avgB.toFixed(1)} proj</span>
                </div>
                <div className="predictor-team-info right">
                  <span className="predictor-team-name">{teamName(rB, userMap)}</span>
                  <span className="predictor-avg">avg {avgB.toFixed(1)}</span>
                </div>
                {avB && <img src={avB} alt="" className="avatar-sm" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
