import type { SleeperLeague } from '../types/sleeper';

interface Props {
  league: SleeperLeague | undefined;
}

const WAIVER_TYPES: Record<number, string> = {
  0: 'Standard (rolling)',
  1: 'Standard (reset)',
  2: 'FAAB',
};

const WAIVER_DAYS: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

function scoringFormat(s: Record<string, number>): string {
  const rec = s['rec'] ?? 0;
  if (rec === 1) return 'PPR';
  if (rec === 0.5) return 'Half PPR';
  if (rec === 0) return 'Standard';
  return `${rec} PPR`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">{title}</div>
      <div className="settings-grid">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <span className="settings-value">{value ?? '—'}</span>
    </div>
  );
}

export default function LeagueSettings({ league }: Props) {
  if (!league) return <div className="loading">Loading settings…</div>;

  const s = league.settings;
  const sc = league.scoring_settings ?? {};

  const tdPts = sc['pass_td'] ?? sc['passing_td'] ?? null;
  const intPts = sc['pass_int'] ?? sc['passing_int'] ?? null;
  const rushYdPts = sc['rush_yd'] ?? sc['rushing_yd'] ?? null;
  const recYdPts = sc['rec_yd'] ?? sc['receiving_yd'] ?? null;
  const recPts = sc['rec'] ?? null;

  const notableScoringKeys = new Set([
    'pass_td','passing_td','pass_int','passing_int',
    'rush_yd','rushing_yd','rec_yd','receiving_yd','rec',
  ]);
  const extraScoring = Object.entries(sc)
    .filter(([k, v]) => !notableScoringKeys.has(k) && v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 12);

  return (
    <div className="settings-wrap">
      <Section title="League">
        <Row label="Format" value={scoringFormat(sc)} />
        <Row label="Teams" value={s.num_teams} />
        <Row label="Season" value={league.season} />
        <Row label="Status" value={league.status} />
        <Row label="Playoff Teams" value={s.playoff_teams} />
        <Row label="Playoffs Start Week" value={s.playoff_week_start} />
        {s.trade_deadline ? <Row label="Trade Deadline" value={`Week ${s.trade_deadline}`} /> : null}
        {s.max_keepers ? <Row label="Keepers" value={s.max_keepers} /> : null}
        {s.draft_rounds ? <Row label="Draft Rounds" value={s.draft_rounds} /> : null}
        {s.pick_trading === 1 ? <Row label="Pick Trading" value="Enabled" /> : null}
      </Section>

      <Section title="Roster">
        <Row label="Positions" value={league.roster_positions.join(', ')} />
        {s.taxi_slots ? <Row label="Taxi Squad" value={`${s.taxi_slots} slots`} /> : null}
        {s.reserve_slots ? <Row label="IR Slots" value={`${s.reserve_slots} slots`} /> : null}
        {s.reserve_allow_out === 1 ? <Row label="IR Eligibility" value="OUT allowed" /> : null}
      </Section>

      <Section title="Waivers">
        <Row label="Type" value={WAIVER_TYPES[s.waiver_type ?? 0]} />
        {s.waiver_budget ? <Row label="FAAB Budget" value={`$${s.waiver_budget}`} /> : null}
        {s.waiver_day_of_week != null
          ? <Row label="Process Day" value={WAIVER_DAYS[s.waiver_day_of_week]} />
          : null}
        {s.daily_waivers === 1 ? <Row label="Daily Waivers" value="Enabled" /> : null}
        {s.trade_review_days != null
          ? <Row label="Trade Review" value={`${s.trade_review_days} day${s.trade_review_days !== 1 ? 's' : ''}`} />
          : null}
      </Section>

      <Section title="Key Scoring">
        {tdPts != null    && <Row label="Pass TD"    value={`+${tdPts} pts`} />}
        {intPts != null   && <Row label="INT"        value={`${intPts} pts`} />}
        {rushYdPts != null && <Row label="Rush Yd"   value={`+${rushYdPts} pts`} />}
        {recPts != null   && <Row label="Reception"  value={`+${recPts} pts`} />}
        {recYdPts != null && <Row label="Rec Yd"     value={`+${recYdPts} pts`} />}
      </Section>

      {extraScoring.length > 0 && (
        <Section title="More Scoring Rules">
          {extraScoring.map(([k, v]) => (
            <Row key={k} label={k.replace(/_/g, ' ')} value={`${v > 0 ? '+' : ''}${v} pts`} />
          ))}
        </Section>
      )}
    </div>
  );
}
