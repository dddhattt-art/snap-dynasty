import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import Home from './pages/Home';

const UserLeagues = lazy(() => import('./pages/UserLeagues'));
const LeagueDashboard = lazy(() => import('./pages/LeagueDashboard'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={
          <div className="app-loader">
            <div className="app-loader-logo">
              <span className="app-loader-snap">Snap</span>
              <span className="app-loader-dot">·</span>
            </div>
            <div className="app-loader-bar"><div className="app-loader-fill" /></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/user/:userId" element={<UserLeagues />} />
            <Route path="/league/:leagueId" element={<LeagueDashboard />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
