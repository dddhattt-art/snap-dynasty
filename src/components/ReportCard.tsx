import { useState, useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup, SleeperLeague } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  league?: SleeperLeague;
  isLoading: boolean;
}

function letterGrade(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 87) return 'A−';
  if (score >= 83) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 77) return 'B−';
  if (score >= 73) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 67) return 'C−';
  if (score >= 60) return 'D';
  return 'F';
}

function gradeColor(g: string): string {
  if (g.startsWith('A')) return 'var(--green)';
  if (g.startsWith('B')) return '#1a6fa8';
  if (g.startsWith('C')) return 'var(--yellow)';
  return 'var(--red)';
}

export default function ReportCard({ rosters, userMap, seasonMatchups, league, isLoading }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const reports = useMemo(() => {
    if (!seasonMatchups || !rosters.length) return [];

    const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);
    const playoffStart = league?.settings.playoff_week_start ?? 15;
    const regWeeks = weeks.filter(w => w < playoffStart);
    const n = rosters.length;

    // Per-team season stats
    const teamStats = rosters.map(r => {
      let pf = 0, pa = 0, wins = 0, losses = 0;
      let allPlayWins = 0, allPlayGames = 0;
      const weekScores: number[] = [];

      for (const w of regWeeks) {
        const matchups = seasonMatchups[w] ?? [];
        const mine = matchups.find(m => m.roster_id === r.roster_id);
        if (!mine || mine.points === 0) continue;

        const opp = matchups.find(m => m.matchup_id === mine.matchup_id && m.roster_id !== r.roster_id);
        if (!opp) continue;

        pf += mine.points;
        pa += opp.points;
        if (mine.points > opp.points) wins++; else losses++;
        weekScores.push(mine.points);

        // All-play
        const uniqueScores = [...new Set(matchups.map(m => m.points))];
        for (const s of uniqueScores) {
          if (s === mine.points) continue;
          allPlayGames++;
          if (mine.points > s) allPlayWins++;
        }
      }

      const avgPf = weekScores.length ? pf / weekScores.length : 0;
      const mean = avgPf;
      const variance = weekScores.length > 1 ? weekScores.reduce((s, x) => s + (x - mean) ** 2, 0) / weekScores.length : 0;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

      return { rosterId: r.roster_id, pf, pa, wins, losses, avgPf, cv, allPlayWins, allPlayGames, weekScores };
    });

    // Rank each metric
    const pfRanks = [...teamStats].sort((a, b) => b.pf - a.pf);
    const winPctRanks = [...teamStats].sort((a, b) => (b.wins / (b.wins + b.losses || 1)) - (a.wins / (a.wins + a.losses || 1)));
    const consistencyRanks = [...teamStats].sort((a, b) => a.cv - b.cv);

    return teamStats.map(ts => {
      const pfRank = pfRanks.findIndex(x => x.rosterId === ts.rosterId) + 1;
      const winRank = winPctRanks.findIndex(x => x.rosterId === ts.rosterId) + 1;
      const consRank = consistencyRanks.findIndex(x => x.rosterId === ts.rosterId) + 1;

      const winPct = ts.wins + ts.losses > 0 ? ts.wins / (ts.wins + ts.losses) : 0;
      const expectedWins = ts.allPlayGames > 0 ? (ts.allPlayWins / ts.allPlayGames) * (ts.wins + ts.losses) : ts.wins;
      const luckDelta = ts.wins - expectedWins;

      // Composite score (0-100)
      const pfScore = ((n - pfRank) / (n - 1)) * 35;
      const winScore = ((n - winRank) / (n - 1)) * 40;
      const consScore = ((n - consRank) / (n - 1)) * 15;
      const luckScore = Math.min(10, Math.max(0, 5 + luckDelta * 1.5));
      const composite = pfScore + winScore + consScore + luckScore;

      const grade = letterGrade(composite);

      // Narrative
      const isTopScorer = pfRank === 1;
      const isTopRecord = winRank === 1;
      const isConsistent = consRank <= 3;
      const isLucky = luckDelta > 1.5;
      const isUnlucky = luckDelta < -1.5;

      let narrative = '';
      if (isTopScorer && isTopRecord) narrative = 'The complete package — scoring champion and best record. The team to beat.';
      else if (isTopScorer && isUnlucky) narrative = `Led the league in scoring but luck wasn't on their side. Expected ${expectedWins.toFixed(1)} wins based on all-play.`;
      else if (isTopScorer && !isTopRecord) narrative = `One of the league's highest scorers, but the schedule and bad luck kept them from more wins.`;
      else if (isTopRecord && !isTopScorer) narrative = 'Great record, but scoring leaves room to worry come playoffs. May have benefited from an easy schedule.';
      else if (isLucky) narrative = `Rode their luck this season — got the right matchups at the right time. ${luckDelta.toFixed(1)} wins above expected.`;
      else if (isUnlucky) narrative = `Deserved better. ${Math.abs(luckDelta).toFixed(1)} wins below what the schedule-independent all-play record suggests.`;
      else if (isConsistent) narrative = 'A reliable, consistent team. No blowups, no monster weeks — just steady production.';
      else narrative = `A mixed season. ${winPct >= 0.5 ? 'Finished above .500' : 'Struggled to find consistency'} with the ${pfRank <= n / 2 ? 'scoring to compete' : 'offense holding them back'}.`;

      return {
        rosterId: ts.rosterId,
        grade,
        composite,
        wins: ts.wins,
        losses: ts.losses,
        pf: ts.pf,
        avgPf: ts.avgPf,
        pfRank,
        luckDelta,
        narrative,
        weekScores: ts.weekScores,
      };
    }).sort((a, b) => b.composite - a.composite);
  }, [seasonMatchups, rosters, league]);

  if (isLoading) return <div className="loading">Generating report cards…</div>;
  if (!reports.length) return <div className="empty">No season data yet.</div>;

  const selected = selectedId !== null ? reports.find(r => r.rosterId === selectedId) : reports[0];
  const roster = selected ? rosters.find(r => r.roster_id === selected.rosterId) : null;
  const user = roster ? userMap.get(roster.owner_id) : null;
  const av = user ? avatarUrl(user.avatar) : null;

  const maxScore = selected ? Math.max(...selected.weekScores, 1) : 1;

  return (
    <div className="report-wrap">
      {/* Team selector */}
      <div className="report-selector">
        {reports.map(rpt => {
          const r = rosters.find(x => x.roster_id === rpt.rosterId);
          const u = userMap.get(r?.owner_id ?? '');
          const isActive = (selectedId === null ? reports[0].rosterId : selectedId) === rpt.rosterId;
          return (
            <button
              key={rpt.rosterId}
              className={`report-selector-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedId(rpt.rosterId)}
            >
              <span className="report-mini-grade" style={{ color: gradeColor(rpt.grade) }}>{rpt.grade}</span>
              <span>{u?.display_name ?? u?.username ?? `Team ${rpt.rosterId}`}</span>
            </button>
          );
        })}
      </div>

      {/* Report card */}
      {selected && (
        <div className="report-card">
          <div className="report-card-header">
            {av && <img src={av} alt="" className="report-avatar" />}
            <div className="report-card-identity">
              <div className="report-card-name">{user?.display_name ?? user?.username ?? 'Team'}</div>
              <div className="report-card-season">{league?.name} · {league?.season}</div>
            </div>
            <div className="report-grade-block">
              <div className="report-grade" style={{ color: gradeColor(selected.grade) }}>{selected.grade}</div>
              <div className="report-grade-label">Season Grade</div>
            </div>
          </div>

          <div className="report-narrative">{selected.narrative}</div>

          <div className="report-stats-grid">
            <div className="report-stat">
              <div className="report-stat-value">{selected.wins}–{selected.losses}</div>
              <div className="report-stat-label">Record</div>
            </div>
            <div className="report-stat">
              <div className="report-stat-value">{selected.avgPf.toFixed(1)}</div>
              <div className="report-stat-label">Avg Score</div>
            </div>
            <div className="report-stat">
              <div className="report-stat-value">#{selected.pfRank}</div>
              <div className="report-stat-label">Scoring Rank</div>
            </div>
            <div className="report-stat">
              <div className="report-stat-value" style={{ color: selected.luckDelta > 0 ? 'var(--green)' : 'var(--red)' }}>
                {selected.luckDelta > 0 ? '+' : ''}{selected.luckDelta.toFixed(1)}
              </div>
              <div className="report-stat-label">Luck (W vs xW)</div>
            </div>
          </div>

          {/* Score bar chart */}
          {selected.weekScores.length > 0 && (
            <div className="report-chart">
              <div className="report-chart-title">Weekly Scores</div>
              <div className="report-bars">
                {selected.weekScores.map((s, i) => (
                  <div key={i} className="report-bar-col">
                    <div className="report-bar" style={{ height: `${(s / maxScore) * 100}%`, background: s === Math.max(...selected.weekScores) ? 'var(--orange)' : 'var(--accent)' }} />
                    <div className="report-bar-label">{s.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
