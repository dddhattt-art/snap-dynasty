/**
 * Scrapes current NFL salary data from overthecap.com and writes
 * public/salaries.json as { "Player Name": dollarAmount }
 *
 * Strategy:
 *   1. Main contracts page  → APY for ~2,900 players with notable contracts
 *   2. All 32 team cap pages → cap hit for every remaining rostered player
 *      (minimum salary guys, recent signings not yet on main page, etc.)
 *
 * Run manually:  node scripts/update-salaries.js
 * Run via npm:   npm run update-salaries
 */

import { parse } from 'node-html-parser';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'salaries.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

const TEAMS = [
  'arizona-cardinals', 'atlanta-falcons', 'baltimore-ravens', 'buffalo-bills',
  'carolina-panthers', 'chicago-bears', 'cincinnati-bengals', 'cleveland-browns',
  'dallas-cowboys', 'denver-broncos', 'detroit-lions', 'green-bay-packers',
  'houston-texans', 'indianapolis-colts', 'jacksonville-jaguars', 'kansas-city-chiefs',
  'las-vegas-raiders', 'los-angeles-chargers', 'los-angeles-rams', 'miami-dolphins',
  'minnesota-vikings', 'new-england-patriots', 'new-orleans-saints', 'new-york-giants',
  'new-york-jets', 'philadelphia-eagles', 'pittsburgh-steelers', 'san-francisco-49ers',
  'seattle-seahawks', 'tampa-bay-buccaneers', 'tennessee-titans', 'washington-commanders',
];

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseMoney(text) {
  const clean = text.replace(/[$,\s]/g, '');
  const val = parseInt(clean, 10);
  return isNaN(val) ? 0 : val;
}

// Step 1: main contracts page — APY (average per year) for notable contracts
async function scrapeMainContracts() {
  console.log('Fetching OTC contracts page (APY)…');
  const html = await fetchPage('https://overthecap.com/contracts/');
  const root = parse(html);
  const salaries = {};

  // Columns: Player | Pos | Team | Total Value | APY | Guaranteed | Avg Gtd/Yr | % Gtd
  const rows = root.querySelectorAll('table tbody tr');
  console.log(`  Found ${rows.length} contract rows`);

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) continue;
    const nameEl = cells[0].querySelector('a');
    if (!nameEl) continue;
    const name = nameEl.text.trim();
    if (!name) continue;
    const apy = parseMoney(cells[4].text);
    // Keep the higher salary when two players share the same name (e.g. Justin Jefferson WR vs LB)
    if (apy > 0 && apy > (salaries[name] ?? 0)) salaries[name] = apy;
  }

  return salaries;
}

// Step 2: team cap pages — cap hit for every rostered player
async function scrapeTeamPage(team) {
  const url = `https://overthecap.com/salary-cap/${team}/`;
  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.warn(`  ⚠ Skipping ${team}: ${err.message}`);
    return {};
  }

  const root = parse(html);
  const salaries = {};

  // Each team page has multiple year tables; we only want the first (current year).
  // Columns: Player | Base Salary | Prorated Bonus | Roster Bonus | Workout Bonus |
  //          Other Bonus | Guaranteed Salary | Cap Number | Dead Money…
  // Cap Number is column index 7.
  const tables = root.querySelectorAll('table');
  if (!tables.length) return {};

  const rows = tables[0].querySelectorAll('tbody tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 8) continue;
    const nameEl = cells[0].querySelector('a');
    if (!nameEl) continue;
    const name = nameEl.text.trim();
    if (!name) continue;
    const capHit = parseMoney(cells[11].text);
    if (capHit > 0 && capHit > (salaries[name] ?? 0)) salaries[name] = capHit;
  }

  return salaries;
}

async function main() {
  // Step 1: APY from main contracts page
  const salaries = await scrapeMainContracts();
  console.log(`  → ${Object.keys(salaries).length} players from contracts page`);

  // Step 2: fill gaps from all 32 team pages (with small delay to be polite)
  console.log('\nFetching 32 team cap pages…');
  let newFromTeams = 0;

  for (const team of TEAMS) {
    const teamData = await scrapeTeamPage(team);
    for (const [name, capHit] of Object.entries(teamData)) {
      if (!salaries[name]) {
        salaries[name] = capHit;
        newFromTeams++;
      }
    }
    // Note: we intentionally don't override APY with cap hit here —
    // APY is the better long-term salary figure for dynasty purposes.
    // Small delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`  → ${newFromTeams} additional players found from team pages`);

  const count = Object.keys(salaries).length;
  if (count < 100) {
    console.error(`Only got ${count} players — scrape likely failed. Aborting.`);
    process.exit(1);
  }

  writeFileSync(OUT, JSON.stringify(salaries), 'utf8');

  const top5 = Object.entries(salaries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n, v]) => `  ${n}: $${v.toLocaleString()}`)
    .join('\n');

  console.log(`\n✓ Wrote ${count} players to public/salaries.json`);
  console.log('Top 5 by salary:\n' + top5);
}

main().catch(err => { console.error(err); process.exit(1); });
