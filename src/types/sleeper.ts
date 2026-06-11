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
    leg: number;
    num_teams: number;
    waiver_type?: number;
    waiver_budget?: number;
    waiver_day_of_week?: number;
    trade_deadline?: number;
    trade_review_days?: number;
    max_keepers?: number;
    draft_rounds?: number;
    pick_trading?: number;
    taxi_slots?: number;
    reserve_slots?: number;
    reserve_allow_out?: number;
    daily_waivers?: number;
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
  search_rank: number;
}

export type PlayersMap = Record<string, SleeperPlayer>;
