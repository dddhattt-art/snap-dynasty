import { useState, useMemo, useEffect } from 'react';
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
import MySchedule from '../components/MySchedule';
import WeeklyDigest from '../components/WeeklyDigest';
import WeeklyAwards from '../components/WeeklyAwards';

type Tab =
  | 'myteam' | 'my-schedule' | 'standings' | 'matchups' | 'transactions' | 'roster' | 'playoffs' | 'draft' | 'settings'
  | 'power' | 'free-agents' | 'trade' | 'h2h' | 'charts'
  | 'luck' | 'optimal' | 'activity' | 'scatter' | 'schedule'
  | 'playoff-odds' | 'draft-grade' | 'trends' | 'waiver-value'
  | 'blowouts' | 'positional' | 'records' | 'consistency' | 'whatif' | 'history'
  | 'news' | 'bench' | 'trade-history' | 'predictor' | 'report-card'
  | 'weekly-digest' | 'weekly-awards';

interface NavItem { id: Tab; label: string; icon: string; }
interface NavGroup { title: string; items: NavItem[]; }
interface NavGroup { title: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  {
    title: 'League',
    items: [
      { id: 'myteam',         label: 'My Team',          icon: '⚡' },
      { id: 'my-schedule',   label: 'My Schedule',      icon: '📆' },
      { id: 'weekly-digest', label: 'Weekly Digest',    icon: '📰' },
      { id: 'weekly-awards', label: 'Weekly Awards',    icon: '🏆' },
      { id: 'standings',    label: 'Standings',        icon: '🏅' },
      { id: 'matchups',     label: 'Matchups',         icon: '🏈' },
      { id: 'roster',       label: 'Rosters',          icon: '📋' },
      { id: 'playoffs',     label: 'Playoff Bracket',  icon: '🏆' },
      { id: 'draft',        label: 'Draft Board',      icon: '🎯' },
      { id: 'settings',     label: 'League Settings',  icon: '⚙️' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'news',         label: 'Player News',       icon: '🏥' },
      { id: 'predictor',    label: 'Matchup Predictor', icon: '🔮' },
      { id: 'report-card',  label: 'Report Cards',      icon: '📝' },
      { id: 'bench',        label: 'Bench Points',      icon: '💤' },
      { id: 'power',        label: 'Power Rankings',    icon: '⚡' },
      { id: 'playoff-odds', label: 'Playoff Odds',      icon: '📊' },
      { id: 'luck',         label: 'Luck Index',        icon: '🍀' },
      { id: 'optimal',      label: 'Lineup Efficiency', icon: '🎯' },
      { id: 'consistency',  label: 'Consistency',       icon: '📐' },
      { id: 'schedule',     label: 'Schedule Strength', icon: '📅' },
      { id: 'draft-grade',  label: 'Draft Grades',      icon: '🎓' },
    ],
  },
  {
    title: 'Charts',
    items: [
      { id: 'charts',       label: 'Season Scoring',   icon: '📈' },
      { id: 'trends',       label: 'Team Trends',      icon: '〰️' },
      { id: 'scatter',      label: 'PF vs PA Map',     icon: '🗺️' },
      { id: 'positional',   label: 'Position Strength', icon: '🏈' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'trade',        label: 'Trade Analyzer',   icon: '🔄' },
      { id: 'free-agents',  label: 'Free Agents',      icon: '🔍' },
      { id: 'h2h',          label: 'Head-to-Head',     icon: '🥊' },
      { id: 'whatif',       label: 'What-If Machine',  icon: '🤔' },
    ],
  },
  {
    title: 'The Ledger',
    items: [
      { id: 'transactions',  label: 'Weekly Moves',         icon: '📦' },
      { id: 'activity',      label: 'Season Activity',      icon: '🔔' },
      { id: 'waiver-value',  label: 'Waiver Wins',          icon: '💎' },
      { id: 'trade-history', label: 'Trade History',        icon: '🤝' },
      { id: 'records',       label: 'Record Book',          icon: '📖' },
      { id: 'blowouts',      label: 'Blowouts & Squeakers', icon: '💥' },
      { id: 'history',       label: 'League History',       icon: '🗂️' },
    ],
  },
];

const TITLES: Record<Tab, string> = {
  'myteam': 'My Team',
  'my-schedule': 'My Schedule', 'weekly-digest': 'Weekly Digest', 'weekly-awards': 'Weekly Awards', 'standings': 'Standings', 'matchups': 'Matchups', 'transactions': 'Weekly Moves',
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
  'myteam','my-schedule','weekly-digest','weekly-awards','power','h2h','charts','trade','luck','optimal','scatter','schedule',
  'playoff-odds','trends','blowouts','positional','records','consistency','whatif',
  'bench','predictor','report-card',
];
const PLAYERS_TABS: Tab[] = ['myteam','roster','free-agents','trade','optimal','activity','waiver-value','positional','draft-grade','transactions','records','news','trade-history'];
const SEASON_TX_TABS: Tab[] = ['myteam','activity','waiver-value','trade-history','weekly-digest'];

export default function LeagueDashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const userId: string | undefined = (location.state as { userId?: string } | null)?.userId;
  const [tab, setTab] = useState<Tab>(userId ? 'myteam' : 'standings');
  const [week, setWeek] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(['Charts', 'Tools', 'The Ledger'])
  );

  const selectTab = (id: Tab) => { setTab(id); setSidebarOpen(false); };
  const toggleGroup = (title: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });

  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeague(leagueId!),
    enabled: !!leagueId,
    staleTime: 30 * 60 * 1000,
  });

  const currentWeek = league?.settings?.leg ?? 1;
  const selectedWeek = week ?? currentWeek;

  useEffect(() => {
    if (currentWeek > 1 && week === null) setWeek(currentWeek);
  }, [currentWeek]);

  const { data: rosters } = useQuery<SleeperRoster[]>({
    queryKey: ['rosters', leagueId],
    queryFn: () => getRosters(leagueId!),
    enabled: !!leagueId,
    staleTime: 30 * 60 * 1000,
  });

  const { data: users } = useQuery<SleeperUser[]>({
    queryKey: ['league-users', leagueId],
    queryFn: () => getLeagueUsers(leagueId!),
    enabled: !!leagueId,
    staleTime: 30 * 60 * 1000,
  });

  const { data: matchups, isLoading: matchupsLoading } = useQuery<SleeperMatchup[]>({
    queryKey: ['matchups', leagueId, selectedWeek],
    queryFn: () => getMatchups(leagueId!, selectedWeek),
    enabled: !!leagueId && tab === 'matchups',
  });

  const { data: transactions, isLoading: txLoading } = useQuery<SleeperTransaction[]>({
    queryKey: ['transactions', leagueId, selectedWeek],
    queryFn: () => getTransactions(leagueId!, selectedWeek),
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

  const userMap = useMemo(
    () => new Map<string, SleeperUser>((users ?? []).map(u => [u.user_id, u])),
    [users]
  );
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
            {league?.avatar && <img loading="lazy" src={avatarUrl(league.avatar) ?? undefined} alt="" className="avatar-xs" />}
            <span>{league?.name ?? 'Loading…'}</span>
          </div>
          <div className="side-league-meta">{league?.season ?? ''} · Week {currentWeek}</div>
        </div>

        {NAV.map(group => {
          const collapsed = collapsedGroups.has(group.title);
          return (
          <nav key={group.title} className="nav-group">
            <button className="nav-group-title" onClick={() => toggleGroup(group.title)}>
              <span>{group.title}</span>
              <span className={`nav-group-chevron ${collapsed ? '' : 'open'}`}>›</span>
            </button>
            {!collapsed && group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${tab === item.id ? 'active' : ''}`}
                onClick={() => selectTab(item.id)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          );
        })}
      </aside>

      <main className="content">
        <header className="content-header">
          <h2 className="content-title">{TITLES[tab]}</h2>
          {showWeekControls && (
            <select
              className="week-select"
              value={selectedWeek}
              onChange={e => setWeek(Number(e.target.value))}
            >
              {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          )}
        </header>

        <div key={tab} className="content-body">
        {tab === 'myteam'       && <MyTeam userId={userId} rosters={r} userMap={userMap} players={players} seasonMatchups={sm} seasonTransactions={stx} league={league} isLoading={seasonLoading || playersLoading} />}
        {tab === 'my-schedule'   && <MySchedule userId={userId} rosters={r} userMap={userMap} seasonMatchups={sm} currentWeek={currentWeek} isLoading={seasonLoading} />}
        {tab === 'weekly-digest' && <WeeklyDigest userId={userId} rosters={r} userMap={userMap} players={players} seasonMatchups={sm} seasonTransactions={stx} currentWeek={currentWeek} isLoading={seasonLoading || playersLoading} />}
        {tab === 'weekly-awards' && <WeeklyAwards rosters={r} userMap={userMap} players={players} seasonMatchups={sm} week={currentWeek} isLoading={seasonLoading || playersLoading} />}
        {tab === 'standings'    && <Standings rosters={r} userMap={userMap} />}
        {tab === 'matchups'     && <Matchups matchups={matchups ?? []} rosters={r} userMap={userMap} isLoading={matchupsLoading} />}
        {tab === 'transactions' && <Transactions transactions={transactions ?? []} userMap={userMap} rosters={r} players={players} isLoading={txLoading || playersLoading} />}
        {tab === 'roster'       && <Roster rosters={r} userMap={userMap} players={players} userId={userId} isLoading={playersLoading} />}
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
        </div>
      </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-tab-bar">
        {[
          { id: 'myteam'    as Tab, icon: '⚡', label: 'My Team' },
          { id: 'standings' as Tab, icon: '🏅', label: 'Standings' },
          { id: 'matchups'  as Tab, icon: '🏈', label: 'Matchups' },
          { id: 'news'      as Tab, icon: '🏥', label: 'News' },
          { id: 'roster'    as Tab, icon: '📋', label: 'Roster' },
        ].map(item => (
          <button
            key={item.id}
            className={`bottom-tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => selectTab(item.id)}
          >
            <span className="bottom-tab-icon">{item.icon}</span>
            <span className="bottom-tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
