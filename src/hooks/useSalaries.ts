import { useState, useCallback, useMemo } from 'react';
import type { PlayersMap } from '../types/sleeper';

// Normalize player names for fuzzy matching (handles A.J. vs AJ, Jr./Sr. suffixes, etc.)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')        // A.J. -> aj
    .replace(/'/g, "'")        // smart quotes
    .replace(/\s+jr\.?$/i, '') // remove Jr suffix
    .replace(/\s+sr\.?$/i, '') // remove Sr suffix
    .replace(/\s+ii$/i, '')    // remove II suffix
    .replace(/\s+iii$/i, '')   // remove III suffix
    .trim();
}

export type SalaryMap = Record<string, number>; // playerId -> salary in $

// Manual overrides stored in localStorage (per league)
function loadOverrides(key: string | null): SalaryMap {
  if (!key) return {};
  try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
}

export function useSalaries(
  leagueId: string | undefined,
  players: PlayersMap | undefined,
  autoSalaries: Record<string, number> | undefined, // name -> salary from salaries.json
) {
  const key = leagueId ? `snap_salaries_${leagueId}` : null;
  const [overrides, setOverrides] = useState<SalaryMap>(() => loadOverrides(key));

  const setSalary = useCallback((playerId: string, amount: number) => {
    setOverrides(prev => {
      const next = { ...prev, [playerId]: amount };
      if (key) localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  // Build a normalized lookup from the auto salary map (handles A.J. vs AJ, Jr. suffix, etc.)
  const normalizedAutoSalaries = useMemo(() => {
    if (!autoSalaries) return null;
    const map = new Map<string, number>();
    for (const [name, salary] of Object.entries(autoSalaries)) {
      map.set(normalizeName(name), salary);
    }
    return map;
  }, [autoSalaries]);

  // Merge: auto-lookup by player name, then apply manual overrides on top
  const salaries = useMemo<SalaryMap>(() => {
    const result: SalaryMap = {};
    if (players && normalizedAutoSalaries) {
      for (const [pid, player] of Object.entries(players)) {
        const key = normalizeName(player.full_name);
        const salary = normalizedAutoSalaries.get(key);
        if (salary) result[pid] = salary;
      }
    }
    return { ...result, ...overrides };
  }, [players, normalizedAutoSalaries, overrides]);

  return { salaries, setSalary };
}
