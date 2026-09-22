#!/usr/bin/env node
/**
 * Refreshes the CDC Lyme disease surveillance data used by the case tracker.
 *
 * CDC publishes the prior calendar year around February and puts the year in BOTH the
 * path segment and the filename prefix. When 2024 data lands, bump DATA_RELEASE and
 * DATA_YEAR below, re-run, and diff data/cdc-lyme.json before committing.
 *
 *   node scripts/refresh-cdc-data.mjs            # download + regenerate
 *   node scripts/refresh-cdc-data.mjs --offline  # regenerate from the CSVs already on disk
 *
 * Source: https://www.cdc.gov/lyme/data-research/facts-stats/surveillance-data-1.html
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

const DATA_RELEASE = '2025/02';
const DATA_YEAR = '2023';
const BASE = `https://www.cdc.gov/lyme/media/files/${DATA_RELEASE}`;

const FILES = {
  cases:  `${DATA_YEAR}_CaseIncid-Lyme-Disease-Overall-Cases-by-Year.csv`,
  rates:  `${DATA_YEAR}_CaseIncid-Lyme-Disease-Overall-Rate-by-Year.csv`,
  region: `${DATA_YEAR}_CaseIncid-Lyme-Disease-Cases-by-Year-and-Region.csv`,
  state:  `${DATA_YEAR}_CaseIncid-Lyme-Disease-Cases-by-State-or-Locality.csv`,
};

const LOCAL = {
  cases:  'cdc-cases-by-year.csv',
  rates:  'cdc-rates-by-year.csv',
  region: 'cdc-cases-by-region.csv',
  state:  'cdc-cases-by-state.csv',
};

/* ------------------------------------------------------------------ parsing */

/** RFC-4180-ish parser. CDC quotes any field containing a thousands separator. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  // Strip the UTF-8 BOM CDC ships on several of these files.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** "3,896" -> 3896 ; "" -> null. */
const num = (v) => {
  const s = String(v ?? '').replace(/,/g, '').trim();
  if (s === '' || s === '-' || s === 'NA') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * CDC appends a footnote dagger to states that changed surveillance method in 2022.
 * It arrives as U+2020 or, depending on the export, as a mojibake replacement char.
 * Strip anything non-ASCII and flag the row so the UI can annotate it.
 */
function cleanStateName(raw) {
  const name = raw.replace(/[^\x20-\x7E]/g, '').trim();
  return { name, footnoted: name !== raw.trim() };
}

/* ------------------------------------------------------------------- fetch */

async function load(key) {
  const dest = path.join(DATA, LOCAL[key]);
  const offline = process.argv.includes('--offline');

  if (!offline) {
    const url = `${BASE}/${FILES[key]}`;
    process.stdout.write(`  fetching ${key} ... `);
    const res = await fetch(url, {
      headers: { 'user-agent': 'LymeAccountabilityProject/1.0 (data refresh; contact via site)' },
    });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes(',')) throw new Error(`${url} did not return CSV`);
    await writeFile(dest, text, 'utf8');
    console.log(`${text.length} bytes`);
    return text;
  }

  if (!existsSync(dest)) throw new Error(`--offline but ${dest} is missing`);
  return readFile(dest, 'utf8');
}

/* ------------------------------------------------------------------ build */

async function main() {
  console.log(`CDC Lyme data refresh (release ${DATA_RELEASE}, through ${DATA_YEAR})`);

  const [casesTxt, ratesTxt, regionTxt, stateTxt] = await Promise.all(
    ['cases', 'rates', 'region', 'state'].map(load)
  );

  // --- national series -----------------------------------------------------
  const cases = new Map();
  for (const [year, v] of parseCSV(casesTxt).slice(1)) cases.set(num(year), num(v));

  const rates = new Map();
  for (const [year, v] of parseCSV(ratesTxt).slice(1)) rates.set(num(year), num(v));

  const years = [...cases.keys()].filter((y) => y !== null).sort((a, b) => a - b);
  const national = years.map((year) => ({
    year,
    cases: cases.get(year),
    incidence: rates.get(year) ?? null,
  }));

  // --- regional series -----------------------------------------------------
  const regionRows = parseCSV(regionTxt).slice(1);
  const regionMap = new Map();
  const regionNames = new Set();
  for (const [year, region, v] of regionRows) {
    const y = num(year);
    if (y === null) continue;
    regionNames.add(region.trim());
    if (!regionMap.has(y)) regionMap.set(y, {});
    regionMap.get(y)[region.trim()] = num(v) ?? 0;
  }
  const regional = [...regionMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, values]) => ({ year, values }));

  // --- state table ---------------------------------------------------------
  const stateRows = parseCSV(stateTxt);
  const stateYears = stateRows[0].slice(1).map(num).filter((y) => y !== null);
  const states = [];
  for (const row of stateRows.slice(1)) {
    const { name, footnoted } = cleanStateName(row[0]);
    if (!name || /^U\.?S\.? Total$/i.test(name)) continue;   // total is derived, not a state
    const values = {};
    stateYears.forEach((y, i) => { values[y] = num(row[i + 1]); });
    states.push({ state: name, footnoted, values });
  }
  states.sort((a, b) => a.state.localeCompare(b.state));

  // --- derived headline numbers -------------------------------------------
  const latest = national[national.length - 1];
  const first = national[0];
  const growthPct = Math.round(((latest.cases - first.cases) / first.cases) * 100);

  const out = {
    meta: {
      source: 'CDC / NNDSS Lyme disease surveillance',
      sourceUrl: 'https://www.cdc.gov/lyme/data-research/facts-stats/surveillance-data-1.html',
      release: DATA_RELEASE,
      throughYear: Number(DATA_YEAR),
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    headline: {
      latestYear: latest.year,
      latestCases: latest.cases,
      latestIncidence: latest.incidence,
      firstYear: first.year,
      firstCases: first.cases,
      growthPct,
      // CDC's own insurance-claims analysis. Surveillance captures roughly a tenth of this.
      estimatedAnnualDiagnosed: 476000,
      estimatedSourceUrl: 'https://www.cdc.gov/lyme/data-research/facts-stats/index.html',
    },
    annotations: [
      {
        years: [2020, 2021],
        kind: 'artifact',
        label: 'COVID-19 reporting disruption',
        detail:
          'Several jurisdictions submitted incomplete data in 2019-2021 because public health ' +
          'staff were redirected to the COVID-19 response. The dip is a reporting artifact, ' +
          'not a fall in disease.',
      },
      {
        years: [2022],
        kind: 'definition-change',
        label: 'Surveillance case definition revised',
        detail:
          'CDC adopted a revised Lyme disease surveillance case definition in 2022. Reported ' +
          'cases rose about 69%. CDC attributes the increase primarily to changed surveillance ' +
          'methods in high-incidence jurisdictions rather than to a real change in disease risk. ' +
          'Do not read the 2021-2022 step as an outbreak.',
        detailUrl: 'https://www.cdc.gov/mmwr/volumes/73/wr/mm7306a1.htm',
      },
    ],
    national,
    regional,
    regionNames: [...regionNames].sort(),
    stateYears,
    states,
  };

  const dest = path.join(DATA, 'cdc-lyme.json');
  await writeFile(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`\n  years        ${first.year}-${latest.year} (${national.length})`);
  console.log(`  ${latest.year} cases   ${latest.cases.toLocaleString('en-US')}`);
  console.log(`  growth       ${growthPct > 0 ? '+' : ''}${growthPct}% since ${first.year}`);
  console.log(`  states       ${states.length}`);
  console.log(`  regions      ${out.regionNames.length}`);
  console.log(`\n  wrote ${path.relative(ROOT, dest)}`);
}

main().catch((err) => {
  console.error('\nrefresh failed:', err.message);
  console.error('If CDC moved the files, check the release path at the top of this script.');
  process.exit(1);
});
