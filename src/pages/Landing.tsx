import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '../api/sleeper';

const FEATURES = [
  { icon: 'chart-bar',      title: 'Power rankings',     desc: 'See who\'s actually hot vs. who got lucky this week.' },
  { icon: 'clover',         title: 'Luck index',         desc: 'Quantify how much fortune is inflating your record.' },
  { icon: 'target',         title: 'Lineup efficiency',  desc: 'How often did you leave points on the bench?' },
  { icon: 'percentage',     title: 'Playoff odds',       desc: 'Simulated odds for every team based on schedule left.' },
  { icon: 'flame',          title: 'Blowouts',           desc: 'The most lopsided wins and closest escapes, ranked.' },
  { icon: 'file-analytics', title: 'Weekly digest',      desc: 'A full recap of your week — score, rank, key players.' },
];

const ICON_COLORS: Record<string, string> = {
  'chart-bar': '#1e40af', clover: '#6d28d9', target: '#16a34a',
  percentage: '#d97706', flame: '#e11d48', 'file-analytics': '#0d9488',
};
const ICON_BG: Record<string, string> = {
  'chart-bar': '#eff6ff', clover: '#f5f3ff', target: '#f0fdf4',
  percentage: '#fffbeb', flame: '#fff1f2', 'file-analytics': '#f0fdfa',
};

const HISTORY = [
  { year: '2024', name: 'Marcus T.', record: '11–3 · 1,842 pts' },
  { year: '2023', name: 'Jordan K.', record: '10–4 · 1,791 pts' },
  { year: '2022', name: 'Marcus T.', record: '12–2 · 1,904 pts' },
  { year: '2021', name: 'Alex R.',   record: '9–5 · 1,756 pts' },
];

export default function Landing() {
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
    const t = input.trim();
    if (t) setSubmitted(t);
  };

  return (
    <div className="lp-wrap">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-logo">
          <div className="lp-logo-mark"><i className="ti ti-bolt" /></div>
          <div>
            <div className="lp-logo-name">Snap</div>
            <div className="lp-logo-sub">fantasy intelligence</div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-eyebrow">
          <i className="ti ti-bolt" /> Built for Sleeper leagues
        </div>
        <h1 className="lp-h1">Your league deserves<br /><span className="lp-h1-accent">better analytics</span></h1>
        <p className="lp-sub">Power rankings, all-time history, head-to-head records, weekly awards, and more — all from your Sleeper username.</p>

        <form className="lp-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="lp-input"
            placeholder="Enter your Sleeper username"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="lp-cta" disabled={isLoading || !input.trim()}>
            {isLoading
              ? <span className="home-spinner" />
              : <><i className="ti ti-arrow-right" /> Go</>
            }
          </button>
        </form>
        {isError && <p className="lp-error">No user found. Double-check your Sleeper username.</p>}
        <p className="lp-no-login">No account needed — just your username.</p>
      </section>

      {/* ── Stats strip ── */}
      <div className="lp-stats">
        {[
          { val: '25+',      lbl: 'Analytics tools' },
          { val: '100%',     lbl: 'Free to use' },
          { val: 'All-time', lbl: 'History support' },
          { val: 'No login', lbl: 'Just your username' },
        ].map(s => (
          <div key={s.lbl} className="lp-stat">
            <div className="lp-stat-val">{s.val}</div>
            <div className="lp-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Feature cards ── */}
      <section className="lp-features">
        <h2 className="lp-section-title">More than just standings</h2>
        <p className="lp-section-sub">Deep analytics that actually tell you something.</p>
        <div className="lp-feature-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon" style={{ background: ICON_BG[f.icon], color: ICON_COLORS[f.icon] }}>
                <i className={`ti ti-${f.icon}`} />
              </div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── History preview ── */}
      <section className="lp-history">
        <div className="lp-history-label">
          <i className="ti ti-history" /> All-time history across every season
        </div>
        {HISTORY.map(h => (
          <div key={h.year} className="lp-history-row">
            <span className="lp-history-year">{h.year}</span>
            <span className="lp-history-trophy">🏆</span>
            <span className="lp-history-name">{h.name}</span>
            <span className="lp-history-record">{h.record}</span>
          </div>
        ))}
      </section>

      {/* ── Bottom CTA ── */}
      <section className="lp-cta-band">
        <h2 className="lp-cta-title">Ready to know your league inside out?</h2>
        <p className="lp-cta-sub">No signup required. Just your Sleeper username.</p>
        <form className="lp-form lp-form-dark" onSubmit={handleSubmit}>
          <input
            type="text"
            className="lp-input lp-input-dark"
            placeholder="Sleeper username"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="lp-cta lp-cta-bright" disabled={isLoading || !input.trim()}>
            Open my leagues →
          </button>
        </form>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <span>© 2025 Snap · fantasy intelligence</span>
        <div className="lp-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Feedback</a>
        </div>
      </footer>
    </div>
  );
}
