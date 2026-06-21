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
import { useSalaries } from '../hooks/useSalaries';
import { fetchSalaryData } from '../api/salaries';
import PlayerNews from '../components/PlayerNews';
import BenchPoints from '../components/BenchPoints';
import TradeHistory from '../components/TradeHistory';
import MatchupPredictor from '../components/MatchupPredictor';
import ReportCard from '../components/ReportCard';
import MySchedule from '../components/MySchedule';
import WeeklyDigest from '../components/WeeklyDigest';
import WeeklyAwards from '../components/WeeklyAwards';
import DraftBoard from '../components/DraftBoard';

type Tab =
  | 'myteam' | 'my-schedule' | 'standings' | 'matchups' | 'transactions' | 'roster' | 'playoffs' | 'draft' | 'settings'
  | 'power' | 'free-agents' | 'trade' | 'h2h' | 'charts'
  | 'luck' | 'optimal' | 'activity' | 'scatter' | 'schedule'
  | 'playoff-odds' | 'draft-grade' | 'trends' | 'waiver-value'
  | 'blowouts' | 'positional' | 'records' | 'consistency' | 'whatif' | 'history'
  | 'news' | 'bench' | 'trade-history' | 'predictor' | 'report-card'
  | 'weekly-digest' | 'weekly-awards' | 'draft-board';

interface SubTab { id: Tab; label: string; }
interface Section { id: string; label: string; icon: string; tabs: SubTab[]; }

const SECTIONS: Section[] = [
  {
    id: 'myteam', label: 'My Team', icon: '⚡',
    tabs: [
      { id: 'myteam',         label: 'Overview' },
      { id: 'my-schedule',    label: 'Schedule' },
      { id: 'weekly-digest',  label: 'Weekly Digest' },
      { id: 'weekly-awards',  label: 'Awards' },
    ],
  },
  {
    id: 'league', label: 'League', icon: '🏅',
    tabs: [
      { id: 'standings',  label: 'Standings' },
      { id: 'matchups',   label: 'Matchups' },
      { id: 'roster',     label: 'Rosters' },
      { id: 'playoffs',   label: 'Bracket' },
      { id: 'draft',       label: 'Draft Recap' },
      { id: 'draft-board', label: 'Draft Board' },
      { id: 'settings',   label: 'Settings' },
    ],
  },
  {
    id: 'analytics', label: 'Analytics', icon: '📊',
    tabs: [
      { id: 'power',        label: 'Power Rankings' },
      { id: 'playoff-odds', label: 'Playoff Odds' },
      { id: 'luck',         label: 'Luck Index' },
      { id: 'optimal',      label: 'Efficiency' },
      { id: 'consistency',  label: 'Consistency' },
      { id: 'schedule',     label: 'Strength' },
      { id: 'bench',        label: 'Bench Pts' },
      { id: 'predictor',    label: 'Predictor' },
      { id: 'report-card',  label: 'Report Cards' },
      { id: 'draft-grade',  label: 'Draft Grades' },
    ],
  },
  {
    id: 'charts', label: 'Charts', icon: '📈',
    tabs: [
      { id: 'charts',     label: 'Scoring' },
      { id: 'trends',     label: 'Trends' },
      { id: 'scatter',    label: 'PF vs PA' },
      { id: 'positional', label: 'Positions' },
    ],
  },
  {
    id: 'history', label: 'History', icon: '📖',
    tabs: [
      { id: 'transactions',  label: 'Weekly Moves' },
      { id: 'activity',      label: 'Activity' },
      { id: 'waiver-value',  label: 'Waiver Wins' },
      { id: 'trade-history', label: 'Trades' },
      { id: 'records',       label: 'Records' },
      { id: 'blowouts',      label: 'Blowouts' },
      { id: 'history',       label: 'All-Time' },
    ],
  },
  {
    id: 'tools', label: 'Tools', icon: '🔧',
    tabs: [
      { id: 'trade',       label: 'Trade Analyzer' },
      { id: 'free-agents', label: 'Free Agents' },
      { id: 'h2h',         label: 'Head-to-Head' },
      { id: 'whatif',      label: 'What-If' },
      { id: 'news',        label: 'Player News' },
    ],
  },
];

// Map each tab to its section
const TAB_SECTION: Partial<Record<Tab, string>> = {};
for (const s of SECTIONS) for (const t of s.tabs) TAB_SECTION[t.id] = s.id;

const SECTION_ICONS: Record<string, string> = {
  myteam: 'bolt',
  league: 'trophy',
  analytics: 'chart-bar',
  charts: 'chart-line',
  history: 'history',
  tools: 'tool',
};

const PAGE_ICONS: Partial<Record<Tab, string>> = {
  'myteam': 'home', 'my-schedule': 'calendar', 'weekly-digest': 'file-analytics', 'weekly-awards': 'award',
  'standings': 'list-numbers', 'matchups': 'shield-half', 'roster': 'users', 'playoffs': 'tournament',
  'draft': 'circle-dot', 'draft-board': 'clipboard-list', 'settings': 'settings',
  'power': 'chart-bar', 'playoff-odds': 'percentage', 'luck': 'clover', 'optimal': 'target',
  'consistency': 'activity', 'schedule': 'calendar-stats', 'bench': 'armchair',
  'predictor': 'brain', 'report-card': 'report', 'draft-grade': 'school',
  'charts': 'chart-line', 'trends': 'trending-up', 'scatter': 'chart-dots', 'positional': 'layout-grid',
  'transactions': 'arrows-exchange', 'activity': 'pulse', 'waiver-value': 'star',
  'trade-history': 'repeat', 'records': 'medal', 'blowouts': 'flame', 'history': 'clock',
  'trade': 'arrows-exchange', 'free-agents': 'user-plus', 'h2h': 'users',
  'whatif': 'question-mark', 'news': 'news',
};

const TITLES: Record<Tab, string> = {
  'myteam': 'My Team',
  'my-schedule': 'My Schedule', 'weekly-digest': 'Weekly Digest', 'weekly-awards': 'Weekly Awards', 'standings': 'Standings', 'matchups': 'Matchups', 'transactions': 'Weekly Moves',
  'roster': 'Rosters', 'playoffs': 'Playoff Bracket', 'draft': 'Draft Recap', 'draft-board': 'Draft Board', 'settings': 'League Settings',
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
const PLAYERS_TABS: Tab[] = ['myteam','roster','free-agents','trade','optimal','activity','waiver-value','positional','draft-grade','transactions','records','news','trade-history','draft-board'];
const SEASON_TX_TABS: Tab[] = ['myteam','activity','waiver-value','trade-history','weekly-digest'];

export default function LeagueDashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const userId: string | undefined = (location.state as { userId?: string } | null)?.userId;
  const [tab, setTab] = useState<Tab>(userId ? 'myteam' : 'standings');
  const [week, setWeek] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeSection = SECTIONS.find(s => s.id === TAB_SECTION[tab]) ?? SECTIONS[0];
  const selectTab = (id: Tab) => { setTab(id); setSidebarOpen(false); };
  const selectSection = (s: Section) => { setTab(s.tabs[0].id); setSidebarOpen(false); };

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
    refetchInterval: (() => {
      const d = new Date();
      const day = d.getDay(); // 0=Sun 1=Mon 4=Thu
      const mo = d.getMonth();
      const inSeason = mo >= 8 || mo <= 1; // Sept–Feb
      return inSeason && (day === 0 || day === 1 || day === 4) ? 60_000 : false;
    })(),
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
    enabled: !!leagueHistory && (tab === 'records' || tab === 'history'),
    staleTime: 30 * 60 * 1000,
  });

  const userMap = useMemo(
    () => new Map<string, SleeperUser>((users ?? []).map(u => [u.user_id, u])),
    [users]
  );
  const { data: autoSalaries } = useQuery<Record<string, number>>({
    queryKey: ['salary-data'],
    queryFn: fetchSalaryData,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { salaries, setSalary } = useSalaries(leagueId, players, autoSalaries);
  const showWeekControls = tab === 'matchups' || tab === 'transactions';
  const myRoster = rosters && userId ? rosters.find(r => r.owner_id === userId) : undefined;
  const myUser = myRoster ? userMap.get(myRoster.owner_id) : undefined;

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
          <i className="ti ti-menu-2" />
        </button>
      </div>

      {/* Overlay — outside the grid */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="dash">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="side-logo" onClick={() => navigate(-1)}>
          <div className="side-logo-mark">S</div>
          <div>
            <div className="side-logo-name">Snap</div>
            <div className="side-logo-sub">fantasy intelligence</div>
          </div>
        </button>

        <div className="side-league">
          <div className="side-league-name">
            {league?.avatar && <img loading="lazy" src={avatarUrl(league.avatar) ?? undefined} alt="" className="avatar-xs" />}
            <span>{league?.name ?? 'Loading…'}</span>
          </div>
          <div className="side-league-meta">{league?.season ?? ''} · Week {currentWeek} · {league?.settings?.num_teams ?? '—'} teams</div>
        </div>

        <nav className="nav-group">
          {SECTIONS.map(s => {
            const isActive = activeSection.id === s.id;
            return (
              <div key={s.id} className="nav-section-group">
                <button
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectSection(s)}
                >
                  <i className={`ti ti-${SECTION_ICONS[s.id]} nav-item-icon`} aria-hidden="true" />
                  <span>{s.label}</span>
                </button>
                {isActive && (
                  <div className="nav-subtabs">
                    {s.tabs.map(t => (
                      <button
                        key={t.id}
                        className={`nav-subtab ${tab === t.id ? 'active' : ''}`}
                        onClick={() => selectTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {myUser && (
          <div className="side-footer">
            {myUser.avatar
              ? <img src={avatarUrl(myUser.avatar)!} alt="" className="side-footer-av" />
              : <div className="side-footer-av side-footer-av-init">{(myUser.display_name ?? myUser.username ?? '?')[0].toUpperCase()}</div>
            }
            <div>
              <div className="side-footer-name">{myUser.display_name ?? myUser.username}</div>
              <div className="side-footer-role">Commissioner</div>
            </div>
          </div>
        )}
      </aside>

      <main className="content">
        <header className="page-header">
          <div className="page-header-left">
            <div className="page-header-icon">
              <i className={`ti ti-${PAGE_ICONS[tab] ?? 'layout-dashboard'}`} aria-hidden="true" />
            </div>
            <div>
              <h2 className="page-title">{TITLES[tab]}</h2>
              <div className="page-subtitle">{league?.name ?? ''}{league?.season ? ` · ${league.season}` : ''}</div>
            </div>
          </div>
          <div className="page-header-right">
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
          </div>
        </header>

        <div className="page-tabs">
          {activeSection.tabs.map(t => (
            <button
              key={t.id}
              className={`page-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="content-body">
        <div key={tab} className="content-fade">
        {tab === 'myteam'       && <MyTeam userId={userId} rosters={r} userMap={userMap} players={players} seasonMatchups={sm} seasonTransactions={stx} league={league} isLoading={seasonLoading || playersLoading} salaries={salaries} setSalary={setSalary} />}
        {tab === 'my-schedule'   && <MySchedule userId={userId} rosters={r} userMap={userMap} seasonMatchups={sm} currentWeek={currentWeek} isLoading={seasonLoading} />}
        {tab === 'weekly-digest' && <WeeklyDigest userId={userId} rosters={r} userMap={userMap} players={players} seasonMatchups={sm} seasonTransactions={stx} currentWeek={currentWeek} isLoading={seasonLoading || playersLoading} />}
        {tab === 'weekly-awards' && <WeeklyAwards rosters={r} userMap={userMap} players={players} seasonMatchups={sm} week={currentWeek} isLoading={seasonLoading || playersLoading} />}
        {tab === 'standings'    && <Standings rosters={r} userMap={userMap} />}
        {tab === 'matchups'     && <Matchups matchups={matchups ?? []} rosters={r} userMap={userMap} isLoading={matchupsLoading} />}
        {tab === 'transactions' && <Transactions transactions={transactions ?? []} userMap={userMap} rosters={r} players={players} isLoading={txLoading || playersLoading} />}
        {tab === 'roster'       && <Roster rosters={r} userMap={userMap} players={players} userId={userId} isLoading={playersLoading} salaries={salaries} setSalary={setSalary} />}
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
        {tab === 'history'      && <LeagueHistory history={leagueHistory} allTimeMatchups={allTimeMatchups} allTimeLoading={allTimeLoading} userId={userId} isLoading={historyLoading} />}
        {tab === 'settings'     && <LeagueSettings league={league} />}
        {tab === 'news'         && <PlayerNews rosters={r} userMap={userMap} players={players} isLoading={playersLoading} />}
        {tab === 'bench'        && <BenchPoints rosters={r} userMap={userMap} seasonMatchups={sm} isLoading={seasonLoading} />}
        {tab === 'trade-history' && <TradeHistory seasonTransactions={stx} rosters={r} userMap={userMap} players={players} isLoading={seasonTxLoading || playersLoading} />}
        {tab === 'predictor'    && <MatchupPredictor rosters={r} userMap={userMap} seasonMatchups={sm} league={league} isLoading={seasonLoading} />}
        {tab === 'report-card'  && <ReportCard rosters={r} userMap={userMap} seasonMatchups={sm} league={league} isLoading={seasonLoading} />}
        {tab === 'draft-board'  && <DraftBoard players={players} leagueId={leagueId!} teamCount={league?.settings?.num_teams ?? 12} isLoading={playersLoading} />}
        </div>
        </div>
      </main>
      </div>

      {/* Mobile bottom tab bar — sections only */}
      <nav className="bottom-tab-bar">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`bottom-tab ${activeSection.id === s.id ? 'active' : ''}`}
            onClick={() => selectSection(s)}
          >
            <i className={`ti ti-${SECTION_ICONS[s.id]} bottom-tab-icon`} aria-hidden="true" />
            <span className="bottom-tab-label">{s.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
