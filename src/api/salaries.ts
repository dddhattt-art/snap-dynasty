// Fetches the pre-built salary lookup (player full name → APY in $) from /salaries.json
// Data sourced from nflverse/OTC contract data.

let cache: Record<string, number> | null = null;

export async function fetchSalaryData(): Promise<Record<string, number>> {
  if (cache) return cache;
  const res = await fetch('/salaries.json');
  if (!res.ok) throw new Error('Failed to load salary data');
  cache = await res.json() as Record<string, number>;
  return cache;
}
