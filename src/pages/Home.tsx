import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '../api/sleeper';

const FEATURES = [
  { icon: '📊', label: 'Power Rankings' },
  { icon: '🎯', label: 'Luck Index' },
  { icon: '📈', label: 'Scoring Trends' },
  { icon: '🏆', label: 'Record Book' },
  { icon: '🔮', label: 'Matchup Predictor' },
  { icon: '📋', label: 'Report Cards' },
];

export default function Home() {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const navigate = useNavigate();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user', submitted],
    queryFn: () => getUser(submitted),
    enabled: !!submitted,
    retry: false,
  });

  if (user) navigate(`/user/${user.user_id}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) setSubmitted(trimmed);
  };

  return (
    <div className="home">
      <div className="home-card">
        <div className="home-logo">
          <span className="home-logo-snap">Snap</span>
          <span className="home-logo-dot">·</span>
        </div>
        <p className="home-tagline">Your Sleeper league, dissected.</p>

        <form onSubmit={handleSubmit} className="home-form">
          <input
            type="text"
            placeholder="Sleeper username"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="home-cta">
            {isLoading ? (
              <span className="home-cta-loading">
                <span className="home-spinner" />
              </span>
            ) : (
              <>Let's go <span className="home-cta-arrow">→</span></>
            )}
          </button>
        </form>

        {isError && (
          <p className="home-error">No user found. Double-check your Sleeper username.</p>
        )}

        <div className="home-features">
          {FEATURES.map(f => (
            <div key={f.label} className="home-feature-pill">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        <p className="home-footer">Connects to your Sleeper account — no login required.</p>
      </div>
    </div>
  );
}
