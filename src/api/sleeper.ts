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

async function get<T>(url: string, params?: Record<string, string | number>): Promise<T> {
  const full = params
    ? `${url}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`
    : url;
  const res = await fetch(full);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const getUser = (username: string) =>
  get<SleeperUser>(`${BASE}/user/${username}`);

export const getUserLeagues = (userId: string, season: string) =>
  get<SleeperLeague[]>(`${BASE}/user/${userId}/leagues/nfl/${season}`);

export const getRosters = (leagueId: string) =>
  get<SleeperRoster[]>(`${BASE}/league/${leagueId}/rosters`);

export const getLeagueUsers = (leagueId: string) =>
  get<SleeperUser[]>(`${BASE}/league/${leagueId}/users`);

export const getMatchups = (leagueId: string, week: number) =>
  get<SleeperMatchup[]>(`${BASE}/league/${leagueId}/matchups/${week}`);

export const getTransactions = (leagueId: string, week: number) =>
  get<SleeperTransaction[]>(`${BASE}/league/${leagueId}/transactions/${week}`);

export const getLeague = (leagueId: string) =>
  get<SleeperLeague>(`${BASE}/league/${leagueId}`);

export const getWinnersBracket = (leagueId: string) =>
  get<SleeperBracketMatch[]>(`${BASE}/league/${leagueId}/winners_bracket`);

export const getLosersBracket = (leagueId: string) =>
  get<SleeperBracketMatch[]>(`${BASE}/league/${leagueId}/losers_bracket`);

export const getDraftPicks = (draftId: string) =>
  get<SleeperDraftPick[]>(`${BASE}/draft/${draftId}/picks`);

const PLAYERS_CACHE_KEY = 'snap_players_cache';
const PLAYERS_CACHE_TTL = 24 * 60 * 60 * 1000;

export const getAllPlayers = async (): Promise<PlayersMap> => {
  try {
    const raw = localStorage.getItem(PLAYERS_CACHE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < PLAYERS_CACHE_TTL) return data;
    }
  } catch {}
  const data = await get<PlayersMap>(`${BASE}/players/nfl`);
  try {
    localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
  return data;
};

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

export const getTrendingPlayers = (type: 'add' | 'drop', lookback_hours = 24, limit = 25) =>
  get<{ player_id: string; count: number }[]>(`${BASE}/players/nfl/trending/${type}`, { lookback_hours, limit });

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

export interface EspnArticle {
  id: number;
  headline: string;
  description: string;
  published: string;
  link: string;
  athleteIds: number[];
}

export const getEspnNflNews = async (limit = 100): Promise<EspnArticle[]> => {
  const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  const res = await fetch(`${ESPN}/news?limit=${limit}`);
  if (!res.ok) throw new Error('ESPN news unavailable');
  const data = await res.json();
  return (data.articles ?? []).map((a: Record<string, unknown>) => {
    const athleteIds = ((a.categories as {type?: string; athleteId?: number}[] | undefined) ?? [])
      .filter(c => c.type === 'athlete' && c.athleteId)
      .map(c => c.athleteId as number);
    const webLink = (a.links as {web?: {href?: string}} | undefined)?.web?.href ?? '';
    return {
      id: a.id as number,
      headline: a.headline as string,
      description: (a.description as string | undefined) ?? '',
      published: a.published as string,
      link: webLink,
      athleteIds,
    };
  });
};
