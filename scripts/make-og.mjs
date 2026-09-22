#!/usr/bin/env node
/**
 * Generates the OpenGraph share images.
 *
 *   npm run og
 *
 * Run this locally whenever the headline numbers change, then COMMIT the PNGs. The
 * rasterizer is a local dev dependency on purpose: the Cloudflare Pages build container
 * has no guaranteed font set, and a share image that silently renders as blank squares
 * is worse than one that is a day stale.
 *
 * X and Facebook do not render SVG for og:image, which is why these are PNGs.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'static', 'assets', 'og');

const W = 1200;
const H = 630;

const BG = '#0f1419';
const SURFACE = '#161d24';
const TEXT = '#eef2f5';
const MUTED = '#a9b8c4';
const ACCENT = '#2f9c63';
const ALARM = '#e05c5c';
const SERIES = '#3987e5';

const FONT = "'Segoe UI', 'DejaVu Sans', 'Liberation Sans', Arial, Helvetica, sans-serif";

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmt = (n) => Number(n).toLocaleString('en-US');

/** Naive wrap: OG headlines are short and the widths here are generous. */
function wrap(text, perLine) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > perLine) {
      lines.push(line.trim());
      line = w;
    } else line += ` ${w}`;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${ALARM}"/>
  ${inner}
  <g transform="translate(64, 556)">
    <circle cx="12" cy="0" r="11" fill="none" stroke="${ALARM}" stroke-width="2.6"/>
    <circle cx="12" cy="0" r="4" fill="${ALARM}"/>
    <text x="36" y="6" font-family="${FONT}" font-size="22" font-weight="700" fill="${TEXT}">The Lyme Accountability Project</text>
    <text x="36" y="34" font-family="${FONT}" font-size="18" fill="${MUTED}">knowlyme.com</text>
  </g>
</svg>`;
}

function headline(eyebrow, lines, sub, accent = ALARM) {
  const y0 = 150;
  return frame(`
  <text x="64" y="96" font-family="${FONT}" font-size="22" font-weight="700"
        letter-spacing="3" fill="${accent}">${esc(eyebrow.toUpperCase())}</text>
  ${lines
    .map(
      (l, i) =>
        `<text x="64" y="${y0 + i * 72}" font-family="${FONT}" font-size="60" font-weight="800" fill="${TEXT}">${esc(l)}</text>`
    )
    .join('\n  ')}
  ${
    sub
      ? wrap(sub, 74)
          .slice(0, 3)
          .map(
            (l, i) =>
              `<text x="64" y="${y0 + lines.length * 72 + 22 + i * 36}" font-family="${FONT}" font-size="27" fill="${MUTED}">${esc(l)}</text>`
          )
          .join('\n  ')
      : ''
  }`);
}

/** The tracker card: real data, drawn as a spark area behind the numbers. */
function trackerCard(data) {
  const series = data.national;
  const max = Math.max(...series.map((d) => d.cases));
  const x0 = 64, y0 = 330, w = W - 128, h = 170;
  const pts = series.map((d, i) => ({
    x: x0 + (i / (series.length - 1)) * w,
    y: y0 + h - (d.cases / max) * h,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${(x0 + w).toFixed(1)},${y0 + h} L${x0},${y0 + h} Z`;

  return frame(`
  <text x="64" y="90" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="3" fill="${ALARM}">LYME DISEASE IN AMERICA</text>

  <g transform="translate(64, 130)">
    <text x="0" y="52" font-family="${FONT}" font-size="76" font-weight="800" fill="${TEXT}">${fmt(data.headline.latestCases)}</text>
    <text x="0" y="88" font-family="${FONT}" font-size="24" fill="${MUTED}">cases reported to CDC in ${data.headline.latestYear}</text>
  </g>

  <g transform="translate(600, 130)">
    <text x="0" y="52" font-family="${FONT}" font-size="76" font-weight="800" fill="${ALARM}">~${fmt(data.headline.estimatedAnnualDiagnosed)}</text>
    <text x="0" y="88" font-family="${FONT}" font-size="24" fill="${MUTED}">actually diagnosed and treated each year</text>
  </g>

  <path d="${area}" fill="${SERIES}" opacity="0.16"/>
  <path d="${line}" fill="none" stroke="${SERIES}" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="${pts.at(-1).x.toFixed(1)}" cy="${pts.at(-1).y.toFixed(1)}" r="7" fill="${SERIES}" stroke="${BG}" stroke-width="3"/>
  <text x="64" y="${y0 + h + 30}" font-family="${FONT}" font-size="20" fill="${MUTED}">${data.national[0].year}</text>
  <text x="${W - 64}" y="${y0 + h + 30}" text-anchor="end" font-family="${FONT}" font-size="20" fill="${MUTED}">${data.headline.latestYear}</text>`);
}

function render(svg, file) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
    background: BG,
  });
  return writeFile(file, resvg.render().asPng());
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const data = JSON.parse(await readFile(path.join(ROOT, 'data', 'cdc-lyme.json'), 'utf8'));
  const g = data.headline.growthPct;

  const cards = {
    'default.png': trackerCard(data),
    'tracker.png': trackerCard(data),
    'petition.png': headline(
      'Sign the petition',
      ['Publish the record.', 'Fund the science.'],
      'A verified signature is one more documented American. Not a lawsuit — a petition, and a registry counsel can evaluate.',
      ACCENT
    ),
    'history.png': headline(
      'The documented record',
      ['Congress asked three times.', 'The files are still sealed.'],
      'Every claim sourced and rated: documented, under investigation, or allegation.'
    ),
    'news.png': headline(
      'Updated every six hours',
      ['Lyme disease news,', 'from the primary sources.'],
      'PubMed, ClinicalTrials.gov, Congress.gov, the Federal Register, CDC, NIH and the wire.',
      SERIES
    ),
    'stories.png': headline(
      'In their own words',
      ['What this disease', 'actually costs.'],
      'First-hand accounts from Americans living with Lyme disease and its aftermath.'
    ),
    'growth.png': headline(
      `Up ${g}% since ${data.headline.firstYear}`,
      ['Reported cases have', 'more than quintupled.'],
      `From ${fmt(data.headline.firstCases)} in ${data.headline.firstYear} to ${fmt(data.headline.latestCases)} in ${data.headline.latestYear}. Source: CDC surveillance data.`
    ),
  };

  for (const [name, svg] of Object.entries(cards)) {
    await render(svg, path.join(OUT, name));
    console.log(`  ${name}`);
  }
  console.log(`\nwrote ${Object.keys(cards).length} share images to static/assets/og/`);
}

main().catch((err) => {
  console.error('og generation failed:', err.message);
  process.exit(1);
});
