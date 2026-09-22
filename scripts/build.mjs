#!/usr/bin/env node
/**
 * Renders the static site into dist/.
 *
 *   node scripts/build.mjs
 *
 * Everything the reader needs on first paint is server-rendered here, including the
 * charts. Client JS only adds hover, filtering and the live counters.
 */
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { page, SITE } from '../src/layout.js';
import { home } from '../src/pages/home.js';
import { history } from '../src/pages/history.js';
import { petition } from '../src/pages/petition.js';
import { news } from '../src/pages/news.js';
import { stories, storyShare } from '../src/pages/stories.js';
import { spread } from '../src/pages/spread.js';
import { admin } from '../src/pages/admin.js';
import {
  about, privacy, terms, disclaimer, sources,
  verified, checkEmail, storyThanks, notFound,
} from '../src/pages/static-pages.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

/** '/petition/' -> dist/petition/index.html ; '/404.html' -> dist/404.html */
function outPath(routePath) {
  if (routePath.endsWith('.html')) return path.join(DIST, routePath.replace(/^\//, ''));
  return path.join(DIST, routePath.replace(/^\//, ''), 'index.html');
}

async function emit(spec) {
  const file = outPath(spec.path);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, page(spec), 'utf8');
  return spec.path;
}

async function walk(dir, base = dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const data = JSON.parse(await readFile(path.join(ROOT, 'data', 'cdc-lyme.json'), 'utf8'));

  // --- pages ---------------------------------------------------------------
  const specs = [
    home(data),
    news(),
    history(),
    petition(TURNSTILE_SITE_KEY),
    stories(),
    storyShare(TURNSTILE_SITE_KEY),
    spread(),
    about(),
    admin(),
    privacy(),
    terms(),
    disclaimer(),
    sources(),
    verified(),
    checkEmail(),
    storyThanks(),
    notFound(),
  ];
  const routes = [];
  for (const spec of specs) routes.push(await emit(spec));

  // --- static assets -------------------------------------------------------
  await cp(path.join(ROOT, 'static'), DIST, { recursive: true });

  // --- machine-readable data -----------------------------------------------
  await mkdir(path.join(DIST, 'data'), { recursive: true });
  await cp(path.join(ROOT, 'data', 'cdc-lyme.json'), path.join(DIST, 'data', 'cdc-lyme.json'));
  for (const f of ['cdc-cases-by-year.csv', 'cdc-rates-by-year.csv', 'cdc-cases-by-region.csv', 'cdc-cases-by-state.csv']) {
    await cp(path.join(ROOT, 'data', f), path.join(DIST, 'data', f));
  }

  // --- security headers ----------------------------------------------------
  // Cloudflare Pages reads _headers. The CSP is strict: no inline script, and the only
  // third-party origin allowed is Cloudflare's Turnstile widget on the two forms.
  const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; frame-src https://challenges.cloudflare.com; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; upgrade-insecure-requests

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=3600
  Access-Control-Allow-Origin: *

/admin/*
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
`;
  await writeFile(path.join(DIST, '_headers'), headers, 'utf8');

  // Trailing-slash canonicalisation + the news RSS route, which is a Function.
  const redirects = `/petition  /petition/  301
/news      /news/      301
/history   /history/   301
/stories   /stories/   301
/spread    /spread/    301
/about     /about/     301
/admin     /admin/     301
`;
  await writeFile(path.join(DIST, '_redirects'), redirects, 'utf8');

  // --- robots + sitemap ----------------------------------------------------
  const publicRoutes = routes.filter((r) => !r.startsWith('/admin') && !r.endsWith('.html'));
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicRoutes
  .map(
    (r) =>
      `  <url><loc>${SITE.url}${r}</loc><lastmod>${today}</lastmod><changefreq>${
        r === '/' || r === '/news/' ? 'daily' : 'weekly'
      }</changefreq><priority>${r === '/' ? '1.0' : r === '/petition/' ? '0.9' : '0.7'}</priority></url>`
  )
  .join('\n')}
</urlset>
`;
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${SITE.url}/sitemap.xml\n`,
    'utf8'
  );

  // --- report --------------------------------------------------------------
  const files = await walk(DIST);
  let bytes = 0;
  for (const f of files) bytes += (await stat(path.join(DIST, f))).size;

  console.log(`built ${routes.length} pages, ${files.length} files, ${(bytes / 1024).toFixed(0)} KB in ${Date.now() - t0}ms`);
  console.log(`  tracker: ${data.national[0].year}-${data.meta.throughYear}, ${data.states.length} states`);
  for (const r of routes) console.log(`  ${r}`);
}

main().catch((err) => {
  console.error('build failed:', err);
  process.exit(1);
});
