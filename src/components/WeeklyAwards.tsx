import type { SleeperMatchup, SleeperRoster, SleeperUser, PlayersMap } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  seasonMatchups: Record<number, SleeperMatchup[]> | undefined;
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  players: PlayersMap | undefined;
  week: number;
  isLoading: boolean;
}

function fmt(n: number) { return n.toFixed(1); }

function rosterInfo(rosterId: number, rosters: SleeperRoster[], userMap: Map<string, SleeperUser>) {
  const r = rosters.find(x => x.roster_id === rosterId);
  const u = r ? userMap.get(r.owner_id) : undefined;
  return { name: u?.display_name ?? u?.username ?? `Team ${rosterId}`, avatar: u ? avatarUrl(u.avatar) : null };
}

interface Award {
  emoji: string;
  title: string;
  winner: string;
  avatar: string | null;
  detail: string;
  flavor: string;
}

export default function WeeklyAwards({ seasonMatchups, rosters, userMap, players, week, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading awards…</div>;
  if (!seasonMatchups) return <div className="empty">No data available.</div>;

  const entries = seasonMatchups[week] ?? [];
  if (!entries.some(e => e.points > 0)) return <div className="empty">Week {week} hasn't been played yet.</div>;

  const pairs = new Map<number, SleeperMatchup[]>();
  for (const e of entries) {
    const g = pairs.get(e.matchup_id) ?? [];
    g.push(e);
    pairs.set(e.matchup_id, g);
  }

  const played = entries.filter(e => e.points > 0);
  const sorted = [...played].sort((a, b) => b.points - a.points);

  // Award calculations
  const highScorer = sorted[0];
  const lowScorer = sorted[sorted.length - 1];

  // Biggest win margin
  let biggestWin: { winner: SleeperMatchup; loser: SleeperMatchup } | null = null;
  let smallestMargin: { winner: SleeperMatchup; loser: SleeperMatchup } | null = null;
  for (const pair of pairs.values()) {
    if (pair.length < 2) continue;
    const [a, b] = pair;
    if (a.points === 0 && b.points === 0) continue;
    const [winner, loser] = a.points > b.points ? [a, b] : [b, a];
    const margin = winner.points - loser.points;
    if (!biggestWin || margin > biggestWin.winner.points - biggestWin.loser.points) biggestWin = { winner, loser };
    if (!smallestMargin || margin < smallestMargin.winner.points - smallestMargin.loser.points) smallestMargin = { winner, loser };
  }

  // Best single player score across the whole league
  type MvpPlayer = { name: string; pts: number; teamName: string };
  let mvpPlayer: MvpPlayer | null = null;
  for (const entry of played) {
    if (!entry.starters || !entry.starters_points) continue;
    const info = rosterInfo(entry.roster_id, rosters, userMap);
    entry.starters.forEach((id, i) => {
      const pts = entry.starters_points![i] ?? 0;
      const current: MvpPlayer | null = mvpPlayer;
      if (!current || pts > current.pts) {
        mvpPlayer = { name: players?.[id]?.full_name ?? id, pts, teamName: info.name };
      }
    });
  }

  // Worst starting decision — highest bench player that outscored a starter
  let worstDecision: { teamName: string; benchName: string; benchPts: number; starterName: string; starterPts: number; avatar: string | null } | null = null;
  if (players) {
    for (const entry of played) {
      if (!entry.starters || !entry.players_points) continue;
      const starterSet = new Set(entry.starters);
      const benchPts = Object.entries(entry.players_points)
        .filter(([id]) => !starterSet.has(id))
        .map(([id, pts]) => ({ id, pts, name: players[id]?.full_name ?? id }));
      const starterPtsList = entry.starters.map((id, i) => ({
        id, pts: entry.starters_points?.[i] ?? 0, name: players[id]?.full_name ?? id,
      }));
      const topBench = benchPts.reduce((a, b) => b.pts > a.pts ? b : a, benchPts[0]);
      const worstStarter = starterPtsList.reduce((a, b) => b.pts < a.pts ? b : a, starterPtsList[0]);
      if (topBench && worstStarter && topBench.pts > worstStarter.pts) {
        const diff = topBench.pts - worstStarter.pts;
        const existing = worstDecision ? (worstDecision.benchPts - worstDecision.starterPts) : -1;
        if (diff > existing) {
          const info = rosterInfo(entry.roster_id, rosters, userMap);
          worstDecision = { teamName: info.name, avatar: info.avatar, benchName: topBench.name, benchPts: topBench.pts, starterName: worstStarter.name, starterPts: worstStarter.pts };
        }
      }
    }
  }

  // Luckiest win — won despite scoring below league median
  const median = sorted[Math.floor(sorted.length / 2)]?.points ?? 0;
  let luckiestWin: { entry: SleeperMatchup } | null = null;
  for (const pair of pairs.values()) {
    if (pair.length < 2) continue;
    const [a, b] = pair;
    if (a.points === 0 && b.points === 0) continue;
    const [winner] = a.points > b.points ? [a, b] : [b, a];
    if (winner.points < median) {
      if (!luckiestWin || winner.points < luckiestWin.entry.points) luckiestWin = { entry: winner };
    }
  }

  const awards: Award[] = [];

  if (highScorer) {
    const info = rosterInfo(highScorer.roster_id, rosters, userMap);
    awards.push({ emoji: '🔥', title: 'Top Gun', winner: info.name, avatar: info.avatar, detail: `${fmt(highScorer.points)} pts`, flavor: 'Highest score of the week' });
  }
  if (lowScorer) {
    const info = rosterInfo(lowScorer.roster_id, rosters, userMap);
    awards.push({ emoji: '🧊', title: 'Ice Cold', winner: info.name, avatar: info.avatar, detail: `${fmt(lowScorer.points)} pts`, flavor: 'Lowest score of the week' });
  }
  if (biggestWin) {
    const info = rosterInfo(biggestWin.winner.roster_id, rosters, userMap);
    const margin = biggestWin.winner.points - biggestWin.loser.points;
    awards.push({ emoji: '💪', title: 'Steamroller', winner: info.name, avatar: info.avatar, detail: `Won by ${fmt(margin)}`, flavor: 'Biggest margin of victory' });
  }
  if (smallestMargin) {
    const info = rosterInfo(smallestMargin.winner.roster_id, rosters, userMap);
    const margin = smallestMargin.winner.points - smallestMargin.loser.points;
    awards.push({ emoji: '😅', title: 'Survived', winner: info.name, avatar: info.avatar, detail: `Won by ${fmt(margin)}`, flavor: 'Narrowest win of the week' });
  }
  const mvp = mvpPlayer;
  if (mvp) {
    awards.push({ emoji: '⭐', title: 'MVP', winner: mvp.teamName, avatar: null, detail: `${mvp.name} · ${fmt(mvp.pts)} pts`, flavor: 'Best individual player performance' });
  }
  if (worstDecision) {
    awards.push({ emoji: '🤦', title: 'Wrong Call', winner: worstDecision.teamName, avatar: worstDecision.avatar, detail: `${worstDecision.benchName} (${fmt(worstDecision.benchPts)}) sat over ${worstDecision.starterName} (${fmt(worstDecision.starterPts)})`, flavor: 'Biggest lineup mistake of the week' });
  }
  if (luckiestWin) {
    const info = rosterInfo(luckiestWin.entry.roster_id, rosters, userMap);
    awards.push({ emoji: '🍀', title: 'Lucky Dog', winner: info.name, avatar: info.avatar, detail: `Won with ${fmt(luckiestWin.entry.points)} pts (below median)`, flavor: 'Won despite a below-median score' });
  }

  return (
    <div className="awards-wrap">
      <div className="awards-week-label">Week {week} Awards</div>
      <div className="awards-grid">
        {awards.map(a => (
          <div key={a.title} className="award-card">
            <div className="award-emoji">{a.emoji}</div>
            <div className="award-body">
              <div className="award-title">{a.title}</div>
              <div className="award-winner">
                {a.avatar && <img loading="lazy" src={a.avatar} alt="" className="avatar-xs" />}
                <span>{a.winner}</span>
              </div>
              <div className="award-detail">{a.detail}</div>
              <div className="award-flavor">{a.flavor}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
