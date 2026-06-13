import { useMemo } from 'react';
import type { SleeperBracketMatch, SleeperRoster, SleeperUser } from '../types/sleeper';
import { avatarUrl } from '../api/sleeper';

interface Props {
  winners: SleeperBracketMatch[];
  losers: SleeperBracketMatch[];
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  isLoading: boolean;
}

interface MatchPos { x: number; centerY: number; }

const ROW = 36;
const MATCH_H = ROW * 2;
const MATCH_W = 200;
const GAP = 56;
const COL = MATCH_W + GAP;
const BASE = 120;
const LABEL_H = 28;

function calcPositions(
  m: number, top: number, h: number,
  pos: Map<number, MatchPos>,
  mm: Map<number, SleeperBracketMatch>
) {
  const match = mm.get(m);
  if (!match) return;
  pos.set(m, { x: (match.r - 1) * COL, centerY: top + h / 2 });
  const half = h / 2;
  if (match.t1_from?.w) calcPositions(match.t1_from.w, top, half, pos, mm);
  if (match.t2_from?.w) calcPositions(match.t2_from.w, top + half, half, pos, mm);
}

function teamInfo(id: number | null, rosters: SleeperRoster[], userMap: Map<string, SleeperUser>) {
  if (!id) return { name: 'TBD', avatar: null };
  const r = rosters.find(x => x.roster_id === id);
  const u = r ? userMap.get(r.owner_id) : undefined;
  return {
    name: u?.display_name ?? u?.username ?? `Team ${id}`,
    avatar: u ? avatarUrl(u.avatar) : null,
  };
}

function BracketSection({
  matches, rosters, userMap, title,
}: {
  matches: SleeperBracketMatch[];
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
  title: string;
}) {
  const { positions, totalW, totalH, maxR } = useMemo(() => {
    if (!matches.length) return { positions: new Map<number, MatchPos>(), totalW: 0, totalH: 0, maxR: 0 };
    const mm = new Map(matches.map(m => [m.m, m]));
    const maxR = Math.max(...matches.map(m => m.r));
    const finalMatch = matches.filter(m => m.r === maxR)[0];
    const numLeaves = Math.pow(2, maxR - 1);
    const totalH = Math.max(numLeaves * BASE, MATCH_H + 40);
    const positions = new Map<number, MatchPos>();
    calcPositions(finalMatch.m, 0, totalH, positions, mm);
    return { positions, totalW: maxR * COL, totalH, maxR };
  }, [matches]);

  if (!matches.length) return null;

  const roundLabels: Record<number, string> = { [maxR]: 'Championship' };
  if (maxR >= 2) roundLabels[maxR - 1] = 'Semifinals';
  if (maxR >= 3) roundLabels[1] = 'Wild Card';

  // Build SVG connector paths
  const paths: { key: string; d: string }[] = [];
  for (const match of matches) {
    const pos = positions.get(match.m);
    if (!pos) continue;
    const midX = pos.x + MATCH_W + GAP / 2;

    for (const [slot, src] of [
      ['t1', match.t1_from?.w],
      ['t2', match.t2_from?.w],
    ] as [string, number | undefined][]) {
      if (!src) continue;
      const fp = positions.get(src);
      if (!fp) continue;
      const fromX = fp.x + MATCH_W;
      const fromY = fp.centerY;
      const toX = pos.x;
      const toY = slot === 't1' ? pos.centerY - ROW / 2 : pos.centerY + ROW / 2;
      paths.push({ key: `${src}-${slot}-${match.m}`, d: `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}` });
    }
  }

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{
        fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '0.75rem',
      }}>
        {title}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ position: 'relative', width: totalW, height: totalH + LABEL_H }}>

          {/* Round column labels */}
          {Array.from({ length: maxR }, (_, i) => i + 1).map(r => (
            <div key={r} style={{
              position: 'absolute', top: 0, left: (r - 1) * COL,
              width: MATCH_W, textAlign: 'center',
              fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.09em', color: 'var(--text-dim)',
            }}>
              {roundLabels[r] ?? `Round ${r}`}
            </div>
          ))}

          {/* SVG connector lines */}
          <svg
            style={{ position: 'absolute', top: LABEL_H, left: 0, overflow: 'visible', pointerEvents: 'none' }}
            width={totalW} height={totalH}
          >
            {paths.map(p => (
              <path key={p.key} d={p.d} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>

          {/* Match cards */}
          {matches.map(match => {
            const pos = positions.get(match.m);
            if (!pos) return null;
            const t1 = teamInfo(match.t1, rosters, userMap);
            const t2 = teamInfo(match.t2, rosters, userMap);
            const t1win = match.w !== null && match.w === match.t1;
            const t2win = match.w !== null && match.w === match.t2;
            const played = match.w !== null;

            return (
              <div key={match.m} style={{
                position: 'absolute',
                left: pos.x,
                top: LABEL_H + pos.centerY - MATCH_H / 2,
                width: MATCH_W,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: 'var(--shadow)',
              }}>
                {([
                  { info: t1, win: t1win, lose: played && !t1win && match.t1 !== null },
                  { info: t2, win: t2win, lose: played && !t2win && match.t2 !== null },
                ] as const).map(({ info, win, lose }, ri) => (
                  <div key={ri} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '0 10px',
                    height: ROW,
                    borderBottom: ri === 0 ? '1px solid var(--border)' : 'none',
                    background: win ? 'rgba(28,138,78,0.07)' : 'transparent',
                  }}>
                    {info.avatar
                      ? <img src={info.avatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />
                      : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface2)', flexShrink: 0 }} />
                    }
                    <span style={{
                      flex: 1,
                      fontSize: '0.78rem',
                      fontWeight: win ? 700 : 400,
                      color: lose ? 'var(--text-dim)' : 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {info.name}
                    </span>
                    {win && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>W</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Bracket({ winners, losers, rosters, userMap, isLoading }: Props) {
  if (isLoading) return <div className="loading">Loading bracket…</div>;
  if (!winners.length) return <div className="empty">Bracket not available yet.</div>;

  return (
    <div className="bracket-wrap">
      <BracketSection matches={winners} rosters={rosters} userMap={userMap} title="Winners Bracket" />
      {losers.length > 0 && (
        <BracketSection matches={losers} rosters={rosters} userMap={userMap} title="Consolation Bracket" />
      )}
    </div>
  );
}
