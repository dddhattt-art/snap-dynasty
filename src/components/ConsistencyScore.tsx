import { useMemo } from 'react';
import type { SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

function consistencyGrade(cv: number): string {
  if (cv < 0.08) return 'A';
  if (cv < 0.12) return 'B';
  if (cv < 0.16) return 'C';
  if (cv < 0.20) return 'D';
  return 'F';
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'var(--green)';
  if (grade === 'B') return 'var(--yellow)';
  if (grade === 'C') return 'var(--text-dim)';
  return 'var(--red)';
}

export default function ConsistencyScore({ rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Computing consistency scores…</div>;
  if (!seasonMatchups || !rosters.length) return <div className="empty">No season data yet.</div>;

  const stats = useMemo(() => {
    const weeks = Object.keys(seasonMatchups).map(Number).sort((a, b) => a - b);
    return rosters.map(r => {
      const scores = weeks.map(w => seasonMatchups[w].find(m => m.roster_id === r.roster_id)?.points ?? 0).filter(p => p > 0);
      const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const variance = scores.length > 1 ? scores.reduce((s, p) => s + (p - mean) ** 2, 0) / scores.length : 0;
      const std = Math.sqrt(variance);
      const cv = mean > 0 ? std / mean : 0;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      return { roster: r, mean, std, cv, min, max };
    }).sort((a, b) => a.cv - b.cv);
  }, [rosters, seasonMatchups]);

  return (
    <div>
      <p className="pr-formula">
        Consistency = coefficient of variation (lower = more consistent). Grade A = most reliable week-to-week.
      </p>
      <table className="standings-table">
        <thead>
          <tr><th>#</th><th>Team</th><th>Avg</th><th>Std Dev</th><th>Range</th><th>Grade</th></tr>
        </thead>
        <tbody>
          {stats.map(({ roster, mean, std, cv, min, max }, i) => {
            const user = userMap.get(roster.owner_id);
            const av = user ? avatarUrl(user.avatar) : null;
            const grade = consistencyGrade(cv);
            return (
              <tr key={roster.roster_id}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? `Team ${roster.roster_id}`}</span>
                </td>
                <td>{mean.toFixed(1)}</td>
                <td>±{std.toFixed(1)}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{min.toFixed(0)}–{max.toFixed(0)}</td>
                <td>
                  <span className="draft-grade-badge" style={{ color: gradeColor(grade), borderColor: gradeColor(grade) }}>
                    {grade}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
