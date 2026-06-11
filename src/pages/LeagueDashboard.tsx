import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getLeague, getRosters, getLeagueUsers, getMatchups, getTransactions,
  getWinnersBracket, getLosersBracket, getDraftPicks, getAllPlayers,
  getSeasonMatchups, getSeasonTransactions, getLeagueChain, getAllTimeMatchups, avatarUrl,
} from '../api/sleeper';
import type {
  SleeperRoster, SleeperUser, SleeperMatchup, SleeperTransaction,
  SleeperBracketMatch, SleeperDraftPick, PlayersMap,
} from '../types/sleeper';
import Standings from '../components/Standings';
import Matchups from '../components/Matchups';
import Transactions from '../components/Transactions';
import Roster from '../components/Roster';
import Bracket from '../components/Bracket';
import DraftRecap from '../components/DraftRecap';
import PowerRankings from '../components/PowerRankings';
import FreeAgents from '../components/FreeAgents';
import TradeAnalyzer from '../components/TradeAnalyzer';
import HeadToHead from '../components/HeadToHead';
import SeasonCharts from '../components/SeasonCharts';
import LuckIndex from '../components/LuckIndex';
import OptimalLineups from '../components/OptimalLineups';
import ActivityFeed from '../components/ActivityFeed';
import ScatterPlot from '../components/ScatterPlot';
import ScheduleDifficulty from '../components/ScheduleDifficulty';
import PlayoffOdds from '../components/PlayoffOdds';
import DraftGrade from '../components/DraftGrade';
import ScoringTrends from '../components/ScoringTrends';
import WaiverValue from '../components/WaiverValue';
import BlowoutTracker from '../components/BlowoutTracker';
import PositionalBreakdown from '../components/PositionalBreakdown';
import SeasonRecords from '../components/SeasonRecords';
import ConsistencyScore from '../components/ConsistencyScore';
import WhatIfStandings from '../components/WhatIfStandings';
import LeagueHistory from '../components/LeagueHistory';
import LeagueSettings from '../components/LeagueSettings';
import MyTeam from '../components/MyTeam';
import PlayerNews from '../components/PlayerNews';
import BenchPoints from '../components/BenchPoints';
import TradeHistory from '../components/TradeHistory';
import MatchupPredictor from '../components/MatchupPredictor';
import ReportCard from '../components/ReportCard';

type Tab =
  | 'myteam' | 'standings' | 'matchups' | 'transactions' | 'roster' | 'playoffs' | 'draft' | 'settings'
  | 'power' | 'free-agents' | 'trade' | 'h2h' | 'charts'
  | 'luck' | 'optimal' | 'activity' | 'scatter' | 'schedule'
  | 'playoff-odds' | 'draft-grade' | 'trends' | 'waiver-value'
  | 'blowouts' | 'positional' | 'records' | 'consistency' | 'whatif' | 'history'
  | 'news' | 'bench' | 'trade-history' | 'predictor' | 'report-card';

interface NavGroup {
  title: string;
  items: { id: Tab; label: string }[];
}

const NAV: NavGroup[] = [
  {
    title: 'League',
    items: [
      { id: 'myteam',       label: 'My Team' },
      { id: 'standings',    label: 'Standings' },
      { id: 'matchups',     label: 'Matchups' },
      { id: 'roster',       label: 'Rosters' },
      { id: 'playoffs',     label: 'Playoff Bracket' },
      { id: 'draft',        label: 'Draft Board' },
      { id: 'settings',     label: 'League Settings' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'news',         label: 'Player News' },
      { id: 'predictor',    label: 'Matchup Predictor' },
      { id: 'report-card',  label: 'Report Cards' },
      { id: 'bench',        label: 'Bench Points' },
      { id: 'power',        label: 'Power Rankings' },
      { id: 'playoff-odds', label: 'Playoff Odds' },
      { id: 'luck',         label: 'Luck Index' },
      { id: 'optimal',      label: 'Lineup Efficiency' },
      { id: 'consistency',  label: 'Consistency' },
      { id: 'schedule',     label: 'Schedule Strength' },
      { id: 'draft-grade',  label: 'Draft Grades' },
    ],
  },
  {
    title: 'Charts',
    items: [
      { id: 'charts',       label: 'Season Scoring' },
      { id: 'trends',       label: 'Team Trends' },
      { id: 'scatter',      label: 'PF vs PA Map' },
      { id: 'positional',   label: 'Position Strength' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'trade',        label: 'Trade Analyzer' },
      { id: 'free-agents',  label: 'Free Agents' },
      { id: 'h2h',          label: 'Head-to-Head' },
      { id: 'whatif',       label: 'What-If Machine' },
    ],
  },
  {
    title: 'The Ledger',
    items: [
      { id: 'transactions',  label: 'Weekly Moves' },
      { id: 'activity',      label: 'Season Activity' },
      { id: 'waiver-value',  label: 'Waiver Wins' },
      { id: 'trade-history', label: 'Trade History' },
      { id: 'records',       label: 'Record Book' },
      { id: 'blowouts',      label: 'Blowouts & Squeakers' },
      { id: 'history',       label: 'League History' },
    ],
  },
];

const TITLES: Record<Tab, string> = {
  'myteam': 'My Team',
  'standings': 'Standings', 'matchups': 'Matchups', 'transactions': 'Weekly Moves',
  'roster': 'Rosters', 'playoffs': 'Playoff Bracket', 'draft': 'Draft Board', 'settings': 'League Settings',
  'power': 'Power Rankings', 'free-agents': 'Free Agents', 'trade': 'Trade Analyzer',
  'h2h': 'Head-to-Head', 'charts': 'Season Scoring', 'luck': 'Luck Index',
  'optimal': 'Lineup Efficiency', 'activity': 'Season Activity', 'scatter': 'PF vs PA Map',
  'schedule': 'Schedule Strength', 'playoff-odds': 'Playoff Odds', 'draft-grade': 'Draft Grades',
  'trends': 'Team Trends', 'waiver-value': 'Waiver Wins', 'blowouts': 'Blowouts & Squeakers',
  'positional': 'Position Strength', 'records': 'Record Book', 'consistency': 'Consistency',
  'whatif': 'What-If Machine', 'history': 'League History',
  'news': 'Player News', 'bench': 'Bench Points', 'trade-history': 'Trade History',
  'predictor': 'Matchup Predictor', 'report-card': 'Report Cards',
};

const SEASON_TABS: Tab[] = [
  'myteam','power','h2h','charts','trade','luck','optimal','scatter','schedule',
  'playoff-odds','trends','blowouts','positional','records','consistency','whatif',
  'bench','predictor','report-card',
];
const PLAYERS_TABS: Tab[] = ['myteam','roster','free-agents','trade','optimal','activity','waiver-value','positional','draft-grade','transactions','records','news','trade-history'];
const SEASON_TX_TABS: Tab[] = ['myteam','activity','waiver-value','trade-history'];

export default function LeagueDashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const userId: string | undefined = (location.state as { userId?: string } | null)?.userId;
  const [tab, setTab] = useState<Tab>(userId ? 'myteam' : 'standings');
  const [week, setWeek] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectTab = (id: Tab) => { setTab(id); setSidebarOpen(false); };

  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeague(leagueId!),
    enabled: !!leagueId,
  });

  const currentWeek = league?.settings?.leg ?? 1;

  const { data: rosters } = useQuery<SleeperRoster[]>({
    queryKey: ['rosters', leagueId],
    queryFn: () => getRosters(leagueId!),
    enabled: !!leagueId,
  });

  const { data: users } = useQuery<SleeperUser[]>({
    queryKey: ['league-users', leagueId],
    queryFn: () => getLeagueUsers(leagueId!),
    enabled: !!leagueId,
  });

  const { data: matchups, isLoading: matchupsLoading } = useQuery<SleeperMatchup[]>({
    queryKey: ['matchups', leagueId, week],
    queryFn: () => getMatchups(leagueId!, week),
    enabled: !!leagueId && tab === 'matchups',
  });

  const { data: transactions, isLoading: txLoading } = useQuery<SleeperTransaction[]>({
    queryKey: ['transactions', leagueId, week],
    queryFn: () => getTransactions(leagueId!, week),
    enabled: !!leagueId && tab === 'transactions',
  });

  const { data: players, isLoading: playersLoading } = useQuery<PlayersMap>({
    queryKey: ['all-players'],
    queryFn: getAllPlayers,
    enabled: PLAYERS_TABS.includes(tab),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: winners, isLoading: winnersLoading } = useQuery<SleeperBracketMatch[]>({
    queryKey: ['winners-bracket', leagueId],
    queryFn: () => getWinnersBracket(leagueId!),
    enabled: !!leagueId && tab === 'playoffs',
  });

  const { data: losers, isLoading: losersLoading } = useQuery<SleeperBracketMatch[]>({
    queryKey: ['losers-bracket', leagueId],
    queryFn: () => getLosersBracket(leagueId!),
    enabled: !!leagueId && tab === 'playoffs',
  });

  const { data: draftPicks, isLoading: draftLoading } = useQuery<SleeperDraftPick[]>({
    queryKey: ['draft-picks', league?.draft_id],
    queryFn: () => getDraftPicks(league!.draft_id),
    enabled: !!league?.draft_id && (tab === 'draft' || tab === 'draft-grade'),
  });

  const { data: seasonMatchups, isLoading: seasonLoading } = useQuery<Record<number, SleeperMatchup[]>>({
    queryKey: ['season-matchups', leagueId, currentWeek],
    queryFn: () => getSeasonMatchups(leagueId!, currentWeek),
    enabled: !!leagueId && currentWeek > 0 && SEASON_TABS.includes(tab),
    staleTime: 5 * 60 * 1000,
  });

  const { data: seasonTransactions, isLoading: seasonTxLoading } = useQuery<Record<number, SleeperTransaction[]>>({
    queryKey: ['season-transactions', leagueId, currentWeek],
    queryFn: () => getSeasonTransactions(leagueId!, currentWeek),
    enabled: !!leagueId && currentWeek > 0 && SEASON_TX_TABS.includes(tab),
    staleTime: 5 * 60 * 1000,
  });

  const { data: leagueHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['league-history', leagueId],
    queryFn: () => getLeagueChain(leagueId!),
    enabled: !!leagueId && (tab === 'history' || tab === 'records'),
    staleTime: 30 * 60 * 1000,
  });

  const { data: allTimeMatchups, isLoading: allTimeLoading } = useQuery({
    queryKey: ['all-time-matchups', leagueId],
    queryFn: () => getAllTimeMatchups(leagueHistory!),
    enabled: !!leagueHistory && tab === 'records',
    staleTime: 30 * 60 * 1000,
  });

  const userMap = new Map<string, SleeperUser>((users ?? []).map(u => [u.user_id, u]));
  const showWeekControls = tab === 'matchups' || tab === 'transactions';

  const r = rosters ?? [];
  const sm = seasonMatchups;
  const stx = seasonTransactions;

  return (
    <div className="dash-wrapper">
      {/* Mobile top bar — outside the grid */}
      <div className="mobile-topbar">
        <div>
          <div className="mobile-topbar-league">{league?.name ?? 'Loading…'}</div>
          <div className="mobile-topbar-meta">{league?.season ?? ''} · Week {currentWeek}</div>
        </div>
        <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Overlay — outside the grid */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="dash">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="side-brand" onClick={() => navigate(-1)}>← Snap</button>
        <div className="side-league">
          <div className="side-league-name">
            {league?.avatar && <img src={avatarUrl(league.avatar) ?? undefined} alt="" className="avatar-xs" />}
            <span>{league?.name ?? 'Loading…'}</span>
          </div>
          <div className="side-league-meta">{league?.season ?? ''} · Week {currentWeek}</div>
        </div>

        {NAV.map(group => (
          <nav key={group.title} className="nav-group">
            <div className="nav-group-title">{group.title}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${tab === item.id ? 'active' : ''}`}
                onClick={() => selectTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ))}
      </aside>

      <main className="content">
        <header className="content-header">
          <h2 className="content-title">{TITLES[tab]}</h2>
          {showWeekControls ? (
            <div className="week-controls">
              <button onClick={() => setWeek(w => Math.max(1, w - 1))}>‹</button>
              <span>Week {week}</span>
              <button onClick={() => setWeek(w => Math.min(18, w + 1))}>›</button>
            </div>
          ) : (
            <span className="content-sub">{league?.name ?? ''}</span>
          )}
        </header>

        {tab === 'myteam'       && <MyTeam userId={userId} rosters={r} userMap={userMap} players={players} seasonMatchups={sm} seasonTransactions={stx} league={league} isLoading={seasonLoading || playersLoading} />}
        {tab === 'standings'    && <Standings rosters={r} userMap={userMap} />}
        {tab === 'matchups'     && <Matchups matchups={matchups ?? []} rosters={r} userMap={userMap} isLoading={matchupsLoading} />}
        {tab === 'transactions' && <Transactions transactions={transactions ?? []} userMap={userMap} rosters={r} players={players} isLoading={txLoading || playersLoading} />}
        {tab === 'roster'       && <Roster rosters={r} userMap={userMap} players={players} isLoading={playersLoading} />}
        {tab === 'playoffs'     && <Bracket winners={winners ?? []} losers={losers ?? []} rosters={r} userMap={userMap} isLoading={winnersLoading || losersLoading} />}
        {tab === 'draft'        && <DraftRecap picks={draftPicks ?? []} rosters={r} userMap={userMap} isLoading={draftLoading} />}
        {tab === 'power'        && <PowerRankings rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'free-agents'  && <FreeAgents rosters={r} players={players} isLoading={playersLoading} />}
        {tab === 'trade'        && <TradeAnalyzer rosters={r} userMap={userMap} players={players} seasonMatchups={sm} isLoading={playersLoading || seasonLoading} />}
        {tab === 'h2h'          && <HeadToHead rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'charts'       && <SeasonCharts rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'luck'         && <LuckIndex rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'optimal'      && <OptimalLineups rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'activity'     && <ActivityFeed seasonTransactions={stx} players={players} userMap={userMap} rosters={r} isLoading={seasonTxLoading || playersLoading} />}
        {tab === 'scatter'      && <ScatterPlot rosters={r} userMap={userMap} />}
        {tab === 'schedule'     && <ScheduleDifficulty rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'playoff-odds' && <PlayoffOdds rosters={r} userMap={userMap} seasonMatchups={sm} league={league} isLoading={seasonLoading} />}
        {tab === 'draft-grade'  && <DraftGrade picks={draftPicks ?? []} rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={draftLoading || seasonLoading} />}
        {tab === 'trends'       && <ScoringTrends rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'waiver-value' && <WaiverValue seasonTransactions={stx} seasonMatchups={sm} players={players} userMap={userMap} rosters={r} isLoading={seasonTxLoading || playersLoading || seasonLoading} />}
        {tab === 'blowouts'     && <BlowoutTracker rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'positional'   && <PositionalBreakdown rosters={r} userMap={userMap} seasonMatchups={sm} players={players} isLoading={seasonLoading || playersLoading} />}
        {tab === 'records'      && <SeasonRecords rosters={r} userMap={userMap} seasonMatchups={sm} players={players} season={league?.season} history={leagueHistory} allTimeMatchups={allTimeMatchups} isLoading={seasonLoading || playersLoading || historyLoading || allTimeLoading} />}
        {tab === 'consistency'  && <ConsistencyScore rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'whatif'       && <WhatIfStandings rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'history'      && <LeagueHistory history={leagueHistory} isLoading={historyLoading} />}
        {tab === 'settings'     && <LeagueSettings league={league} />}
        {tab === 'news'         && <PlayerNews rosters={r} userMap={userMap} players={players} isLoading={playersLoading} />}
        {tab === 'bench'        && <BenchPoints rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'trade-history' && <TradeHistory seasonTransactions={stx} rosters={r} userMap={userMap} players={players} isLoading={seasonTxLoading || playersLoading} />}
        {tab === 'predictor'    && <MatchupPredictor rosters={r} userMap={userMap} seasonMatchups={sm} league={league} isLoading={seasonLoading} />}
        {tab === 'report-card'  && <ReportCard rosters={r} userMap={userMap} seasonMatchups={sm} league={league} isLoading={seasonLoading} />}
      </main>
      </div>
    </div>
  );
}
