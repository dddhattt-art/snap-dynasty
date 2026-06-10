import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getRosters,
  getLeagueUsers,
  getMatchups,
  getTransactions,
  avatarUrl,
} from '../api/sleeper';
import type { SleeperRoster, SleeperUser, SleeperMatchup, SleeperTransaction } from '../types/sleeper';
import Standings from '../components/Standings';
import Matchups from '../components/Matchups';
import Transactions from '../components/Transactions';

type Tab = 'standings' | 'matchups' | 'transactions';

const CURRENT_WEEK = 1;

export default function LeagueDashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('standings');
  const [week, setWeek] = useState(CURRENT_WEEK);

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

  const userMap = new Map<string, SleeperUser>(
    (users ?? []).map(u => [u.user_id, u])
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>League Dashboard</h2>
          <p className="subtitle">Week {week}</p>
        </div>
        <div className="week-controls">
          <button onClick={() => setWeek(w => Math.max(1, w - 1))}>‹</button>
          <span>Wk {week}</span>
          <button onClick={() => setWeek(w => Math.min(18, w + 1))}>›</button>
        </div>
      </header>

      <nav className="tabs">
        {(['standings', 'matchups', 'transactions'] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {tab === 'standings' && (
          <Standings rosters={rosters ?? []} userMap={userMap} />
        )}
        {tab === 'matchups' && (
          <Matchups
            matchups={matchups ?? []}
            rosters={rosters ?? []}
            userMap={userMap}
            isLoading={matchupsLoading}
          />
        )}
        {tab === 'transactions' && (
          <Transactions
            transactions={transactions ?? []}
            userMap={userMap}
            rosters={rosters ?? []}
            isLoading={txLoading}
          />
        )}
      </div>

      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>
    </div>
  );
}
