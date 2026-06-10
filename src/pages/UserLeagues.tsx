import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUserLeagues, getUser, avatarUrl } from '../api/sleeper';

const CURRENT_SEASON = '2025';

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

  if (isLoading) return <div className="loading">Loading leagues…</div>;
  if (isError) return <div className="error-page">Failed to load leagues.</div>;

  const avatar = user ? avatarUrl(user.avatar) : null;

  return (
    <div className="page">
      <header className="page-header">
        {avatar && <img src={avatar} alt="avatar" className="avatar" />}
        <div>
          <h2>{user?.display_name ?? user?.username ?? 'Your Leagues'}</h2>
          <p className="subtitle">{CURRENT_SEASON} Season</p>
        </div>
      </header>

      {!leagues?.length ? (
        <p className="empty">No leagues found for this season.</p>
      ) : (
        <ul className="league-list">
          {leagues.map(league => (
            <li
              key={league.league_id}
              className="league-item"
              onClick={() => navigate(`/league/${league.league_id}`)}
            >
              {league.avatar && (
                <img
                  src={avatarUrl(league.avatar) ?? undefined}
                  alt="league"
                  className="avatar-sm"
                />
              )}
              <div className="league-info">
                <span className="league-name">{league.name}</span>
                <span className="league-meta">
                  {league.total_rosters} teams · {league.status}
                </span>
              </div>
              <span className="chevron">›</span>
            </li>
          ))}
        </ul>
      )}

      <button className="back-btn" onClick={() => navigate('/')}>
        ← Back
      </button>
    </div>
  );
}
