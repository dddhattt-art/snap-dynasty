import type { SleeperDraftPick, SleeperRoster, SleeperUser, SleeperMatchup } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  picks: SleeperDraftPick[];
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  isLoading: boolean;
}

function letterGrade(z: number): string {
  if (z >= 1.0) return 'A+';
  if (z >= 0.5) return 'A';
  if (z >= 0.1) return 'B+';
  if (z >= -0.1) return 'B';
  if (z >= -0.5) return 'C';
  if (z >= -1.0) return 'D';
  return 'F';
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'var(--green)';
  if (grade.startsWith('B')) return 'var(--yellow)';
  if (grade.startsWith('C')) return 'var(--text-dim)';
  return 'var(--red)';
}

export default function DraftGrade({ picks, rosters, userMap, seasonMatchups, isLoading }: Props) {
  if (isLoading) return <div className="loading">Grading drafts…</div>;
  if (!picks.length) return <div className="empty">Draft data not available.</div>;

  const playerSeasonPts = new Map<string, number>();
  if (seasonMatchups) {
    for (const matchups of Object.values(seasonMatchups)) {
      for (const m of matchups) {
        for (const [id, pts] of Object.entries(m.players_points ?? {})) {
          playerSeasonPts.set(id, (playerSeasonPts.get(id) ?? 0) + pts);
        }
      }
    }
  }

  const rounds = [...new Set(picks.map(p => p.round))].sort((a, b) => a - b);
  const roundAvg = new Map<number, number>();
  for (const r of rounds) {
    const roundPicks = picks.filter(p => p.round === r);
    const pts = roundPicks.map(p => playerSeasonPts.get(p.player_id) ?? 0);
    const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
    roundAvg.set(r, avg);
  }

  const roundStd = new Map<number, number>();
  for (const r of rounds) {
    const roundPicks = picks.filter(p => p.round === r);
    const avg = roundAvg.get(r) ?? 0;
    const variance = roundPicks.reduce((s, p) => {
      const diff = (playerSeasonPts.get(p.player_id) ?? 0) - avg;
      return s + diff * diff;
    }, 0) / roundPicks.length;
    roundStd.set(r, Math.sqrt(variance) || 1);
  }

  const rosterOwner = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

  const teamPicks = new Map<string, { pick: SleeperDraftPick; pts: number; z: number }[]>();
  for (const pick of picks) {
    const ownerId = rosterOwner.get(pick.roster_id) ?? pick.picked_by;
    const pts = playerSeasonPts.get(pick.player_id) ?? 0;
    const avg = roundAvg.get(pick.round) ?? 0;
    const std = roundStd.get(pick.round) ?? 1;
    const z = (pts - avg) / std;
    const arr = teamPicks.get(ownerId) ?? [];
    arr.push({ pick, pts, z });
    teamPicks.set(ownerId, arr);
  }

  const stats = [...teamPicks.entries()].map(([ownerId, pickData]) => {
    const avgZ = pickData.reduce((s, p) => s + p.z, 0) / pickData.length;
    const bestPick = [...pickData].sort((a, b) => b.pts - a.pts)[0];
    const worstPick = [...pickData].sort((a, b) => a.pts - b.pts)[0];
    return { ownerId, avgZ, bestPick, worstPick, count: pickData.length };
  }).sort((a, b) => b.avgZ - a.avgZ);

  return (
    <div>
      <p className="pr-formula">
        Grade based on how each pick performed vs. the average for that round.
        A+ = consistently outperformed draft position.
      </p>
      <table className="standings-table">
        <thead>
          <tr><th>#</th><th>Team</th><th>Grade</th><th>Best Pick</th><th>Worst Pick</th></tr>
        </thead>
        <tbody>
          {stats.map(({ ownerId, avgZ, bestPick, worstPick }, i) => {
            const user = userMap.get(ownerId);
            const av = user ? avatarUrl(user.avatar) : null;
            const grade = letterGrade(avgZ);
            return (
              <tr key={ownerId}>
                <td className="rank">{i + 1}</td>
                <td className="team-cell">
                  {av && <img loading="lazy" src={av} alt="" className="avatar-xs" />}
                  <span>{user?.display_name ?? user?.username ?? ownerId}</span>
                </td>
                <td>
                  <span className="draft-grade-badge" style={{ color: gradeColor(grade), borderColor: gradeColor(grade) }}>
                    {grade}
                  </span>
                </td>
                <td className="delta-up" style={{ fontSize: '0.8rem' }}>
                  {bestPick?.pick.metadata?.player_name ?? '—'}
                  <span className="tx-date"> ({bestPick?.pts.toFixed(0)} pts)</span>
                </td>
                <td className="delta-down" style={{ fontSize: '0.8rem' }}>
                  {worstPick?.pick.metadata?.player_name ?? '—'}
                  <span className="tx-date"> ({worstPick?.pts.toFixed(0)} pts)</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
