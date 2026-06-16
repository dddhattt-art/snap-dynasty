import type { SleeperLeague } from '../types/sleeper';

interface Props {
  league: SleeperLeague | undefined;
}

const WAIVER_TYPES: Record<number, string> = {
  0: 'Standard (rolling)',
  1: 'Standard (reset weekly)',
  2: 'FAAB',
};

const WAIVER_DAYS: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

const LEAGUE_TYPES: Record<number, string> = {
  0: 'Redraft', 1: 'Keeper', 2: 'Dynasty',
};

const PLAYOFF_ROUND_TYPES: Record<number, string> = {
  0: '1 week per round',
  1: '2 weeks per round',
  2: '2 weeks (1-week championship)',
};

const PLAYOFF_SEED_TYPES: Record<number, string> = {
  0: 'By record',
  1: 'By total points',
  2: 'By conference record',
};

// Human-readable labels for every scoring key Sleeper uses
const SCORING_LABELS: Record<string, string> = {
  // Passing
  pass_yd: 'Passing Yards', pass_yds: 'Passing Yards',
  pass_td: 'Passing TD', pass_2pt: 'Pass 2PT Conversion',
  pass_int: 'Interception Thrown', pass_int_td: 'Pick-Six Thrown',
  pass_sack: 'Sacked', pass_inc: 'Incomplete Pass',
  pass_cmp: 'Completion', pass_att: 'Pass Attempt',
  pass_cmp_40p: 'Completion 40+ yds', pass_td_40p: 'Pass TD 40+ yds',
  pass_td_50p: 'Pass TD 50+ yds', pass_yd_bonus_300: '300+ Passing Yd Bonus',
  pass_yd_bonus_350: '350+ Passing Yd Bonus', pass_yd_bonus_400: '400+ Passing Yd Bonus',
  // Rushing
  rush_yd: 'Rushing Yards', rush_yds: 'Rushing Yards',
  rush_td: 'Rushing TD', rush_2pt: 'Rush 2PT Conversion',
  rush_att: 'Rush Attempt', rush_fd: 'Rush First Down',
  rush_40p: 'Rush 40+ yds', rush_td_40p: 'Rush TD 40+ yds',
  rush_td_50p: 'Rush TD 50+ yds', rush_yd_bonus_100: '100+ Rush Yd Bonus',
  rush_yd_bonus_150: '150+ Rush Yd Bonus', rush_yd_bonus_200: '200+ Rush Yd Bonus',
  // Receiving
  rec: 'Reception', rec_yd: 'Receiving Yards', rec_yds: 'Receiving Yards',
  rec_td: 'Receiving TD', rec_2pt: 'Rec 2PT Conversion',
  rec_fd: 'Rec First Down', rec_40p: 'Reception 40+ yds',
  rec_td_40p: 'Rec TD 40+ yds', rec_td_50p: 'Rec TD 50+ yds',
  rec_yd_bonus_100: '100+ Rec Yd Bonus', rec_yd_bonus_150: '150+ Rec Yd Bonus',
  rec_yd_bonus_200: '200+ Rec Yd Bonus', rec_0_2: '0–2 Yd Reception',
  // Misc offense
  fum: 'Fumble', fum_lost: 'Fumble Lost', fum_rec_td: 'Fumble Recovery TD',
  st_td: 'Special Teams TD', pr_td: 'Punt Return TD', kr_td: 'Kick Return TD',
  off_snp: 'Offensive Snap',
  // Kicking
  fgm: 'FG Made', fgm_0_19: 'FG 0–19 yds', fgm_20_29: 'FG 20–29 yds',
  fgm_30_39: 'FG 30–39 yds', fgm_40_49: 'FG 40–49 yds',
  fgm_50p: 'FG 50+ yds', fgm_50_59: 'FG 50–59 yds', fgm_60p: 'FG 60+ yds',
  fgmiss: 'FG Missed', fgmiss_0_19: 'FG Miss 0–19 yds',
  fgmiss_20_29: 'FG Miss 20–29 yds', fgmiss_30_39: 'FG Miss 30–39 yds',
  fgmiss_40_49: 'FG Miss 40–49 yds', fgmiss_50p: 'FG Miss 50+ yds',
  xpm: 'Extra Point Made', xpmiss: 'Extra Point Missed',
  // Defense/ST
  sack: 'Sack', sack_yd: 'Sack Yards', safe: 'Safety',
  def_td: 'Defensive TD', def_int: 'Interception', def_int_td: 'Pick-Six',
  def_st_td: 'D/ST Special Teams TD', ff: 'Forced Fumble',
  fum_rec: 'Fumble Recovery', def_fum_rec: 'Defensive Fumble Recovery',
  def_fum_rec_td: 'Fumble Recovery TD', blk_kick: 'Blocked Kick',
  blk_kick_ret_yd: 'Blocked Kick Return Yards', def_pass_def: 'Pass Defended',
  tkl: 'Tackle', tkl_solo: 'Solo Tackle', tkl_ast: 'Assist Tackle',
  tkl_loss: 'Tackle for Loss', qb_hit: 'QB Hit', def_2pt: 'Def 2PT Return',
  pts_allow: 'Points Allowed', pts_allow_0: 'Points Allowed 0',
  pts_allow_1_6: 'Points Allowed 1–6', pts_allow_7_13: 'Points Allowed 7–13',
  pts_allow_14_20: 'Points Allowed 14–20', pts_allow_21_27: 'Points Allowed 21–27',
  pts_allow_28_34: 'Points Allowed 28–34', pts_allow_35p: 'Points Allowed 35+',
  yds_allow: 'Yards Allowed', yds_allow_0_100: 'Yards Allowed 0–100',
  yds_allow_100_199: 'Yards Allowed 100–199', yds_allow_200_299: 'Yards Allowed 200–299',
  yds_allow_300_349: 'Yards Allowed 300–349', yds_allow_350_399: 'Yards Allowed 350–399',
  yds_allow_400_449: 'Yards Allowed 400–449', yds_allow_450_499: 'Yards Allowed 450–499',
  yds_allow_500_549: 'Yards Allowed 500–549', yds_allow_550p: 'Yards Allowed 550+',
  // IDP
  idp_tkl: 'IDP Tackle', idp_tkl_solo: 'IDP Solo Tackle', idp_tkl_ast: 'IDP Assist Tackle',
  idp_tkl_loss: 'IDP Tackle for Loss', idp_sack: 'IDP Sack', idp_pass_def: 'IDP Pass Defended',
  idp_def_int: 'IDP Interception', idp_fum_rec: 'IDP Fumble Recovery', idp_ff: 'IDP Forced Fumble',
  idp_safe: 'IDP Safety', idp_blk_kick: 'IDP Blocked Kick', idp_def_td: 'IDP Defensive TD',
  idp_qb_hit: 'IDP QB Hit',
  // Bonuses
  bonus_rush_yd_100: '100+ Rush Yd Bonus', bonus_rush_yd_200: '200+ Rush Yd Bonus',
  bonus_rec_yd_100: '100+ Rec Yd Bonus', bonus_rec_yd_200: '200+ Rec Yd Bonus',
  bonus_pass_yd_300: '300+ Pass Yd Bonus', bonus_pass_yd_400: '400+ Pass Yd Bonus',
  bonus_rush_rec_yd_100: '100+ Rush+Rec Yd Bonus', bonus_rush_rec_yd_200: '200+ Rush+Rec Yd Bonus',
  bonus_fd_rb: 'RB First Down Bonus', bonus_fd_wr: 'WR First Down Bonus',
  bonus_fd_te: 'TE First Down Bonus', bonus_fd_qb: 'QB First Down Bonus',
  bonus_rec_te: 'TE Reception Bonus', bonus_rec_rb: 'RB Reception Bonus', bonus_rec_wr: 'WR Reception Bonus',
};

function labelFor(key: string): string {
  return SCORING_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

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
  if (value == null) return null;
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <span className="settings-value">{value}</span>
    </div>
  );
}

export default function LeagueSettings({ league }: Props) {
  if (!league) return <div className="loading">Loading settings…</div>;

  const s = league.settings;
  const sc = league.scoring_settings ?? {};

  // Roster positions summary
  const posCounts = new Map<string, number>();
  for (const p of league.roster_positions) posCounts.set(p, (posCounts.get(p) ?? 0) + 1);
  const posStr = [...posCounts.entries()].map(([p, n]) => `${n}×${p}`).join(', ');

  // Split scoring into key + rest, all non-zero
  const KEY_SCORING = ['pass_td','pass_yd','pass_int','pass_2pt',
    'rush_td','rush_yd','rush_2pt','rec','rec_td','rec_yd','rec_2pt',
    'fum_lost','fgm','xpm'];
  const keyRows = KEY_SCORING.filter(k => sc[k] != null && sc[k] !== 0);
  const restRows = Object.entries(sc)
    .filter(([k, v]) => !KEY_SCORING.includes(k) && v !== 0)
    .sort((a, b) => {
      // Group by category prefix
      const cat = (k: string) => k.split('_')[0];
      return cat(a[0]).localeCompare(cat(b[0])) || a[0].localeCompare(b[0]);
    });

  return (
    <div className="settings-wrap">
      <Section title="League">
        <Row label="League Type"       value={LEAGUE_TYPES[s.type ?? 0]} />
        <Row label="Scoring Format"    value={scoringFormat(sc)} />
        <Row label="Teams"             value={s.num_teams} />
        <Row label="Season"            value={league.season} />
        <Row label="Status"            value={league.status.charAt(0).toUpperCase() + league.status.slice(1)} />
        <Row label="Best Ball"         value={s.best_ball === 1 ? 'Yes' : null} />
        <Row label="Divisions"         value={s.divisions && s.divisions > 1 ? s.divisions : null} />
        <Row label="Start Week"        value={s.start_week && s.start_week > 1 ? `Week ${s.start_week}` : null} />
        <Row label="Avg Match"         value={s.league_average_match === 1 ? 'Enabled' : null} />
        <Row label="Adds Disabled"     value={s.disable_adds === 1 ? 'Yes' : null} />
        <Row label="Trades Disabled"   value={s.disable_trades === 1 ? 'Yes' : null} />
      </Section>

      <Section title="Playoffs">
        <Row label="Playoff Teams"     value={s.playoff_teams} />
        <Row label="Start Week"        value={s.playoff_week_start ? `Week ${s.playoff_week_start}` : null} />
        <Row label="Round Format"      value={s.playoff_round_type != null ? PLAYOFF_ROUND_TYPES[s.playoff_round_type] : null} />
        <Row label="Seeding"           value={s.playoff_seed_type != null ? PLAYOFF_SEED_TYPES[s.playoff_seed_type] : null} />
      </Section>

      <Section title="Draft">
        <Row label="Rounds"            value={s.draft_rounds} />
        <Row label="Pick Trading"      value={s.pick_trading === 1 ? 'Enabled' : 'Disabled'} />
        <Row label="Keepers"           value={s.max_keepers ? `${s.max_keepers} per team` : null} />
        <Row label="Keeper Deadline"   value={s.keeper_deadline ? `Week ${s.keeper_deadline}` : null} />
      </Section>

      <Section title="Roster">
        <Row label="Positions"         value={posStr} />
        <Row label="Taxi Squad"        value={s.taxi_slots ? `${s.taxi_slots} slots` : null} />
        <Row label="Taxi Years"        value={s.taxi_years ? `${s.taxi_years} years` : null} />
        <Row label="Taxi Deadline"     value={s.taxi_deadline ? `Week ${s.taxi_deadline}` : null} />
        <Row label="Taxi Vets Allowed" value={s.taxi_allow_vets === 1 ? 'Yes' : null} />
        <Row label="IR Slots"          value={s.reserve_slots ? `${s.reserve_slots} slots` : null} />
        <Row label="IR: Out"           value={s.reserve_allow_out === 1 ? 'Eligible' : null} />
        <Row label="IR: Suspended"     value={s.reserve_allow_sus === 1 ? 'Eligible' : null} />
        <Row label="IR: Doubtful"      value={s.reserve_allow_doubtful === 1 ? 'Eligible' : null} />
        <Row label="IR: NA"            value={s.reserve_allow_na === 1 ? 'Eligible' : null} />
      </Section>

      <Section title="Waivers & Trades">
        <Row label="Waiver Type"       value={WAIVER_TYPES[s.waiver_type ?? 0]} />
        <Row label="FAAB Budget"       value={s.waiver_budget ? `$${s.waiver_budget}` : null} />
        <Row label="Process Day"       value={s.waiver_day_of_week != null ? WAIVER_DAYS[s.waiver_day_of_week] : null} />
        <Row label="Clear Days"        value={s.waiver_clear_days != null ? `${s.waiver_clear_days} days` : null} />
        <Row label="Daily Waivers"     value={s.daily_waivers === 1 ? 'Enabled' : null} />
        <Row label="Trade Deadline"    value={s.trade_deadline ? `Week ${s.trade_deadline}` : null} />
        <Row label="Trade Review"      value={s.trade_review_days != null ? `${s.trade_review_days} day${s.trade_review_days !== 1 ? 's' : ''}` : null} />
        <Row label="Veto Votes Needed" value={s.veto_votes_needed ?? null} />
        <Row label="Show Veto Votes"   value={s.veto_show_votes === 1 ? 'Yes' : null} />
      </Section>

      <Section title="Key Scoring Rules">
        {keyRows.map(k => (
          <Row key={k} label={labelFor(k)} value={`${sc[k]! > 0 ? '+' : ''}${fmt(sc[k]!)} pts`} />
        ))}
      </Section>

      {restRows.length > 0 && (
        <Section title="All Other Scoring Rules">
          {restRows.map(([k, v]) => (
            <Row key={k} label={labelFor(k)} value={`${v > 0 ? '+' : ''}${fmt(v)} pts`} />
          ))}
        </Section>
      )}
    </div>
  );
}
