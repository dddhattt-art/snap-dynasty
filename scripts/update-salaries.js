/**
 * Scrapes current NFL contract APY data from overthecap.com
 * and writes it to public/salaries.json as { "Player Name": apyInDollars }
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

async function scrape() {
  console.log('Fetching OTC contracts page…');
  const html = await fetchPage('https://overthecap.com/contracts/');
  const root = parse(html);

  const salaries = {};

  // Each contract row: Player | Pos | Team | Total Value | APY | Guaranteed | Avg Gtd/Yr | % Gtd
  const rows = root.querySelectorAll('table tbody tr');
  console.log(`Found ${rows.length} table rows`);

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) continue;

    // Player name is in the first cell, inside an <a> tag
    const nameEl = cells[0].querySelector('a');
    if (!nameEl) continue;
    const name = nameEl.text.trim();
    if (!name) continue;

    // APY is the 5th column (index 4)
    const apy = parseMoney(cells[4].text);
    if (apy > 0) salaries[name] = apy;
  }

  return salaries;
}

async function main() {
  const salaries = await scrape();
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

  console.log(`✓ Wrote ${count} players to public/salaries.json`);
  console.log('Top 5:\n' + top5);
}

main().catch(err => { console.error(err); process.exit(1); });
