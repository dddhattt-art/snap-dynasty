export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  sport: string;
  total_rosters: number;
  roster_positions: string[];
  draft_id: string;
  previous_league_id?: string | null;
  settings: {
    playoff_week_start: number;
    playoff_teams?: number;
    playoff_round_type?: number;
    playoff_seed_type?: number;
    playoff_type?: number;
    leg: number;
    num_teams: number;
    type?: number;
    best_ball?: number;
    divisions?: number;
    start_week?: number;
    league_average_match?: number;
    squads?: number;
    capacity_override?: number;
    waiver_type?: number;
    waiver_budget?: number;
    waiver_day_of_week?: number;
    waiver_clear_days?: number;
    daily_waivers?: number;
    daily_waivers_last_ran?: number;
    veto_votes_needed?: number;
    veto_show_votes?: number;
    trade_deadline?: number;
    trade_review_days?: number;
    max_keepers?: number;
    keeper_deadline?: number;
    draft_rounds?: number;
    pick_trading?: number;
    taxi_slots?: number;
    taxi_years?: number;
    taxi_deadline?: number;
    taxi_allow_vets?: number;
    reserve_slots?: number;
    reserve_allow_out?: number;
    reserve_allow_sus?: number;
    reserve_allow_covid?: number;
    reserve_allow_doubtful?: number;
    reserve_allow_na?: number;
    last_scored_leg?: number;
    last_report?: number;
    disable_adds?: number;
    disable_trades?: number;
  };
  scoring_settings: Record<string, number>;
  avatar: string | null;
}

export interface SleeperBracketMatch {
  r: number;
  m: number;
  t1: number | null;
  t2: number | null;
  w: number | null;
  l: number | null;
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
}

export interface SleeperDraftPick {
  pick_no: number;
  round: number;
  draft_slot: number;
  roster_id: number;
  player_id: string;
  picked_by: string;
  metadata: {
    player_name: string;
    position: string;
    team: string;
    first_name: string;
    last_name: string;
  };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[] | null;
  starters: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal: number;
    fpts_against: number;
    fpts_against_decimal: number;
    waiver_position: number;
    waiver_budget_used: number;
    total_moves: number;
    streak: number;
    rank: number;
  };
}

export interface SleeperMatchup {
  matchup_id: number;
  roster_id: number;
  points: number;
  starters: string[];
  players: string[];
  starters_points: number[];
  players_points: Record<string, number>;
}

export interface SleeperTransaction {
  transaction_id: string;
  type: 'trade' | 'free_agent' | 'waiver';
  status: string;
  created: number;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  waiver_budget: { sender: number; receiver: number; amount: number }[];
}

export interface SleeperPlayer {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  age: number | null;
  number: number | null;
  injury_status: string | null;
  injury_notes: string | null;
  practice_participation: string | null;
  practice_description: string | null;
  espn_id: number | null;
  search_rank: number;
  years_exp: number | null;
  college: string | null;
}

export type PlayersMap = Record<string, SleeperPlayer>;
