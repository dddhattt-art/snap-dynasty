/**
 * Scrapes current NFL cap hit data from overthecap.com position pages
 * and writes public/salaries.json as { "Player Name": capHitInDollars }
 *
 * Uses per-position pages (same approach as the GS script) so we get
 * the actual 2026 cap number rather than contract APY.
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

const YEAR = new Date().getFullYear();

const POSITIONS = [
  { url: `https://overthecap.com/position/quarterback/${YEAR}`,   pos: 'QB' },
  { url: `https://overthecap.com/position/running-back/${YEAR}`,  pos: 'RB' },
  { url: `https://overthecap.com/position/wide-receiver/${YEAR}`, pos: 'WR' },
  { url: `https://overthecap.com/position/tight-end/${YEAR}`,     pos: 'TE' },
  { url: `https://overthecap.com/position/kicker/${YEAR}`,        pos: 'K'  },
  { url: `https://overthecap.com/position/fullback/${YEAR}`,      pos: 'FB' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

function parseMoney(text) {
  const clean = text.replace(/[$,\s]/g, '');
  const val = parseInt(clean, 10);
  return isNaN(val) ? 0 : val;
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

// OTC position page column order:
//   Player | Team | Cap Number | Cash Spent | ...
// Cap Number is the FIRST dollar column (index 2).
async function scrapePosition(url, pos) {
  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.warn(`  ⚠ Skipping ${pos}: ${err.message}`);
    return {};
  }

  const root = parse(html);
  const salaries = {};
  const rows = root.querySelectorAll('table tbody tr');

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) continue;

    const nameEl = cells[0].querySelector('a') ?? cells[0];
    const name = nameEl.text.trim();
    if (!name || name.toLowerCase().includes('player')) continue;

    // Find the first cell that looks like a dollar amount
    let capHit = 0;
    for (let i = 1; i < cells.length; i++) {
      const text = cells[i].text.trim();
      if (text.startsWith('$')) {
        capHit = parseMoney(text);
        break;
      }
    }

    if (capHit > 0) {
      // Keep highest if duplicate name
      if (capHit > (salaries[name] ?? 0)) salaries[name] = capHit;
    }
  }

  console.log(`  ${pos}: ${Object.keys(salaries).length} players`);
  return salaries;
}

async function main() {
  console.log(`Scraping OTC position pages for ${YEAR} cap hits…\n`);

  const salaries = {};

  for (const { url, pos } of POSITIONS) {
    const data = await scrapePosition(url, pos);
    for (const [name, capHit] of Object.entries(data)) {
      // Keep higher value if a player appears in multiple positions
      if (capHit > (salaries[name] ?? 0)) salaries[name] = capHit;
    }
    await new Promise(r => setTimeout(r, 800));
  }

  const count = Object.keys(salaries).length;
  if (count < 100) {
    console.error(`\nOnly got ${count} players — scrape likely failed. Aborting.`);
    process.exit(1);
  }

  writeFileSync(OUT, JSON.stringify(salaries), 'utf8');

  const top5 = Object.entries(salaries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n, v]) => `  ${n}: $${v.toLocaleString()}`)
    .join('\n');

  console.log(`\n✓ Wrote ${count} players to public/salaries.json`);
  console.log('Top 5 by cap hit:\n' + top5);
}

main().catch(err => { console.error(err); process.exit(1); });
