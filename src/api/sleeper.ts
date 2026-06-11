import axios from 'axios';
import type {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
  SleeperTransaction,
  SleeperBracketMatch,
  SleeperDraftPick,
  PlayersMap,
} from '../types/sleeper';

const BASE = 'https://api.sleeper.app/v1';
const CDN = 'https://sleepercdn.com';

const api = axios.create({ baseURL: BASE });

export const getUser = (username: string) =>
  api.get<SleeperUser>(`/user/${username}`).then(r => r.data);

export const getUserLeagues = (userId: string, season: string) =>
  api.get<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`).then(r => r.data);

export const getRosters = (leagueId: string) =>
  api.get<SleeperRoster[]>(`/league/${leagueId}/rosters`).then(r => r.data);

export const getLeagueUsers = (leagueId: string) =>
  api.get<SleeperUser[]>(`/league/${leagueId}/users`).then(r => r.data);

export const getMatchups = (leagueId: string, week: number) =>
  api.get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`).then(r => r.data);

export const getTransactions = (leagueId: string, week: number) =>
  api.get<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`).then(r => r.data);

export const getLeague = (leagueId: string) =>
  api.get<SleeperLeague>(`/league/${leagueId}`).then(r => r.data);

export const getWinnersBracket = (leagueId: string) =>
  api.get<SleeperBracketMatch[]>(`/league/${leagueId}/winners_bracket`).then(r => r.data);

export const getLosersBracket = (leagueId: string) =>
  api.get<SleeperBracketMatch[]>(`/league/${leagueId}/losers_bracket`).then(r => r.data);

export const getDraftPicks = (draftId: string) =>
  api.get<SleeperDraftPick[]>(`/draft/${draftId}/picks`).then(r => r.data);

export const getAllPlayers = (): Promise<PlayersMap> =>
  axios.get(`${BASE}/players/nfl`).then(r => r.data);

export const getSeasonTransactions = async (
  leagueId: string,
  maxWeek: number
): Promise<Record<number, SleeperTransaction[]>> => {
  const entries = await Promise.all(
    Array.from({ length: maxWeek }, (_, i) =>
      getTransactions(leagueId, i + 1).then(data => [i + 1, data] as const)
    )
  );
  return Object.fromEntries(entries);
};

export const getLeagueChain = async (
  leagueId: string
): Promise<{ league: SleeperLeague; rosters: SleeperRoster[]; users: SleeperUser[]; bracket: SleeperBracketMatch[] }[]> => {
  const history: { league: SleeperLeague; rosters: SleeperRoster[]; users: SleeperUser[]; bracket: SleeperBracketMatch[] }[] = [];
  let currentId: string | null | undefined = leagueId;
  let safety = 12;
  while (currentId && safety-- > 0) {
    const league = await getLeague(currentId);
    const [rosters, users, bracket] = await Promise.all([
      getRosters(currentId),
      getLeagueUsers(currentId),
      getWinnersBracket(currentId),
    ]);
    history.push({ league, rosters, users, bracket });
    currentId = league.previous_league_id ?? null;
  }
  return history;
};

export const getSeasonMatchups = async (
  leagueId: string,
  maxWeek: number
): Promise<Record<number, SleeperMatchup[]>> => {
  const entries = await Promise.all(
    Array.from({ length: maxWeek }, (_, i) =>
      getMatchups(leagueId, i + 1).then(data => [i + 1, data] as const)
    )
  );
  return Object.fromEntries(entries);
};

export const getTrendingPlayers = (type: 'add' | 'drop', lookback_hours = 24, limit = 25): Promise<{ player_id: string; count: number }[]> =>
  axios.get(`${BASE}/players/nfl/trending/${type}`, { params: { lookback_hours, limit } }).then(r => r.data);

export const getAllTimeMatchups = async (
  history: { league: SleeperLeague; rosters: SleeperRoster[]; users: SleeperUser[]; bracket: SleeperBracketMatch[] }[]
): Promise<Record<string, Record<number, SleeperMatchup[]>>> => {
  const results = await Promise.all(
    history.map(async ({ league }) => {
      const totalWeeks = league.settings.leg ?? 17;
      const matchups = await getSeasonMatchups(league.league_id, totalWeeks);
      return [league.season, matchups] as const;
    })
  );
  return Object.fromEntries(results);
};

export const avatarUrl = (avatarId: string | null, full = false) =>
  avatarId
    ? `${CDN}/avatars/${full ? 'original/' : 'thumbs/'}${avatarId}`
    : null;
