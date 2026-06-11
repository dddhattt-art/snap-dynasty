import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUserLeagues, getUser, avatarUrl } from '../api/sleeper';

const CURRENT_SEASON = '2025';

const STATUS_LABEL: Record<string, string> = {
  complete: 'Season complete',
  in_season: 'In season',
  pre_draft: 'Pre-draft',
  drafting: 'Drafting',
};

export default function UserLeagues() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['user-by-id', userId],
    queryFn: () => getUser(userId!),
    enabled: !!userId,
  });

  const { data: leagues, isLoading, isError } = useQuery({
    queryKey: ['leagues', userId],
    queryFn: () => getUserLeagues(userId!, CURRENT_SEASON),
    enabled: !!userId,
  });

  if (isLoading) return (
    <div className="page">
      <div className="skeleton-header" />
      {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
    </div>
  );
  if (isError) return <div className="error-page">Failed to load leagues.</div>;

  const avatar = user ? avatarUrl(user.avatar) : null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          {avatar
            ? <img src={avatar} alt="avatar" className="avatar" />
            : <div className="avatar avatar-placeholder" />
          }
          <div>
            <h2>{user?.display_name ?? user?.username ?? 'Your Leagues'}</h2>
            <p className="subtitle">{CURRENT_SEASON} Season · {leagues?.length ?? 0} league{leagues?.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
      </header>

      {!leagues?.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏈</div>
          <p>No leagues found for {CURRENT_SEASON}.</p>
          <p className="empty-state-sub">Make sure you're in a Sleeper league this season.</p>
        </div>
      ) : (
        <ul className="league-list">
          {leagues.map(league => {
            const statusLabel = STATUS_LABEL[league.status] ?? league.status;
            const isActive = league.status === 'in_season';
            const isComplete = league.status === 'complete';
            return (
              <li
                key={league.league_id}
                className="league-item"
                onClick={() => navigate(`/league/${league.league_id}`, { state: { userId } })}
              >
                {league.avatar
                  ? <img src={avatarUrl(league.avatar) ?? undefined} alt="league" className="league-avatar" />
                  : <div className="league-avatar league-avatar-placeholder">🏈</div>
                }
                <div className="league-info">
                  <span className="league-name">{league.name}</span>
                  <span className="league-meta">{league.total_rosters} teams</span>
                </div>
                <div className="league-item-right">
                  <span className={`league-status-badge ${isActive ? 'status-active' : isComplete ? 'status-complete' : ''}`}>
                    {statusLabel}
                  </span>
                  <span className="chevron">›</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
