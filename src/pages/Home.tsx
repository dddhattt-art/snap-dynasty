import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '../api/sleeper';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) setSubmitted(trimmed);
  };

  useEffect(() => {
    if (user) navigate(`/user/${user.user_id}`);
  }, [user, navigate]);

  return (
    <div className="home">
      <div className="home-card">
        <h1>Snap</h1>
        <p>The almanac for your Sleeper league — standings, stats, and stories.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter Sleeper username"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? 'Looking up…' : 'Go'}
          </button>
        </form>
        {isError && (
          <p className="error">User not found. Check the username and try again.</p>
        )}
      </div>
    </div>
  );
}
