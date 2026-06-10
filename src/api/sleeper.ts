import axios from 'axios';
import type {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
  SleeperTransaction,
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

export const getAllPlayers = (): Promise<PlayersMap> =>
  axios.get(`${BASE}/players/nfl`).then(r => r.data);

export const avatarUrl = (avatarId: string | null, full = false) =>
  avatarId
    ? `${CDN}/avatars/${full ? 'original/' : 'thumbs/'}${avatarId}`
    : null;
