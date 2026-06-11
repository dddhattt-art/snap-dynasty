import type { SleeperRoster, SleeperUser } from '../types/sleeper';

interface Props {
  rosters: SleeperRoster[];
  userMap: Map<string, SleeperUser>;
}

const W = 680, H = 400;
const ML = 56, MR = 20, MT = 20, MB = 44;
const CW = W - ML - MR, CH = H - MT - MB;

const COLORS = ['#6c63ff','#4caf73','#f0b429','#e05c5c','#5cade0','#e07c5c','#a855f7','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4'];

export default function ScatterPlot({ rosters, userMap }: Props) {
  if (!rosters.length) return <div className="loading">Loading…</div>;

  const pf = (r: SleeperRoster) => (r.settings.fpts ?? 0) + (r.settings.fpts_decimal ?? 0) / 100;
  const pa = (r: SleeperRoster) => (r.settings.fpts_against ?? 0) + (r.settings.fpts_against_decimal ?? 0) / 100;

  const allPF = rosters.map(pf);
  const allPA = rosters.map(pa);
  const minPF = Math.min(...allPF), maxPF = Math.max(...allPF);
  const minPA = Math.min(...allPA), maxPA = Math.max(...allPA);
  const medPF = allPF.reduce((a, b) => a + b, 0) / allPF.length;
  const medPA = allPA.reduce((a, b) => a + b, 0) / allPA.length;

  const padPF = (maxPF - minPF) * 0.1 || 50;
  const padPA = (maxPA - minPA) * 0.1 || 50;
  const pfRange = maxPF - minPF + padPF * 2;
  const paRange = maxPA - minPA + padPA * 2;

  const toX = (v: number) => ML + ((v - minPA + padPA) / paRange) * CW;
  const toY = (v: number) => MT + CH - ((v - minPF + padPF) / pfRange) * CH;

  const medX = toX(medPA);
  const medY = toY(medPF);

  const yTicks = Array.from({ length: 5 }, (_, i) => minPF - padPF + (pfRange / 4) * i);
  const xTicks = Array.from({ length: 5 }, (_, i) => minPA - padPA + (paRange / 4) * i);

  return (
    <div>
      <p className="pr-formula">Good teams: top-left (high PF, low PA). Lucky teams: bottom-left. Unlucky: top-right.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        {/* Quadrant fills */}
        <rect x={ML} y={MT} width={medX - ML} height={medY - MT} fill="rgba(76,175,115,0.06)" />
        <rect x={medX} y={MT} width={W - MR - medX} height={medY - MT} fill="rgba(240,180,41,0.06)" />
        <rect x={ML} y={medY} width={medX - ML} height={H - MB - medY} fill="rgba(108,99,255,0.06)" />
        <rect x={medX} y={medY} width={W - MR - medX} height={H - MB - medY} fill="rgba(224,92,92,0.06)" />

        {/* Quadrant labels */}
        <text x={ML + 6} y={MT + 14} fontSize="10" fill="var(--green)" opacity="0.7">Dominant</text>
        <text x={medX + 6} y={MT + 14} fontSize="10" fill="var(--yellow)" opacity="0.7">Unlucky</text>
        <text x={ML + 6} y={H - MB - 6} fontSize="10" fill="var(--accent)" opacity="0.7">Lucky</text>
        <text x={medX + 6} y={H - MB - 6} fontSize="10" fill="var(--red)" opacity="0.7">Struggling</text>

        {/* Grid + axes */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={ML} y1={toY(tick)} x2={W - MR} y2={toY(tick)} stroke="var(--border)" strokeWidth="1" />
            <text x={ML - 4} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="var(--text-dim)">{tick.toFixed(0)}</text>
          </g>
        ))}
        {xTicks.map(tick => (
          <g key={tick}>
            <line x1={toX(tick)} y1={MT} x2={toX(tick)} y2={H - MB} stroke="var(--border)" strokeWidth="1" />
            <text x={toX(tick)} y={H - MB + 14} textAnchor="middle" fontSize="10" fill="var(--text-dim)">{tick.toFixed(0)}</text>
          </g>
        ))}

        {/* Median lines */}
        <line x1={medX} y1={MT} x2={medX} y2={H - MB} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={ML} y1={medY} x2={W - MR} y2={medY} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Axis labels */}
        <text x={ML + CW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--text-dim)">Points Against →</text>
        <text x={10} y={MT + CH / 2} textAnchor="middle" fontSize="11" fill="var(--text-dim)" transform={`rotate(-90, 10, ${MT + CH / 2})`}>Points For ↑</text>

        {/* Dots */}
        {rosters.map((r, i) => {
          const user = userMap.get(r.owner_id);
          const x = toX(pa(r)), y = toY(pf(r));
          const color = COLORS[i % COLORS.length];
          const name = user?.display_name ?? user?.username ?? `T${r.roster_id}`;
          const flip = x > W * 0.7;
          return (
            <g key={r.roster_id}>
              <circle cx={x} cy={y} r="6" fill={color} opacity="0.9">
                <title>{name}: PF {pf(r).toFixed(1)}, PA {pa(r).toFixed(1)}</title>
              </circle>
              <text
                x={flip ? x - 9 : x + 9}
                y={y + 4}
                fontSize="10"
                fill={color}
                textAnchor={flip ? 'end' : 'start'}
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
