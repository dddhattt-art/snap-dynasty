import { useState, useCallback } from 'react';

const DEFAULT_CAP = 0; // 0 means no cap set

export function useSalaryCap(leagueId: string | undefined) {
  const key = leagueId ? `snap_cap_${leagueId}` : null;

  const [cap, setCapState] = useState<number>(() => {
    if (!key) return DEFAULT_CAP;
    try { return Number(localStorage.getItem(key) ?? '0') || DEFAULT_CAP; } catch { return DEFAULT_CAP; }
  });

  const setCap = useCallback((amount: number) => {
    setCapState(amount);
    if (key) localStorage.setItem(key, String(amount));
  }, [key]);

  return { cap, setCap };
}
