/**
 * The HTML shell every page is rendered into.
 *
 * Kept as one template rather than duplicated across a dozen .html files so the nav,
 * the disclaimers and the meta tags cannot drift apart between pages.
 */

export const SITE = {
  name: 'The Lyme Accountability Project',
  short: 'Lyme Accountability',
  url: 'https://lyme.etrenzik.com',
  tagline: 'Track the cases. Read the record. Demand the files.',
  description:
    'Independent tracker of US Lyme disease case data, a daily news feed, the documented ' +
    'government record, and a petition to declassify federal tick research.',
  locale: 'en_US',
};

export const NAV = [
  { href: '/', label: 'Tracker' },
  { href: '/news/', label: 'News' },
  { href: '/history/', label: 'The Record' },
  { href: '/petition/', label: 'Petition' },
  { href: '/stories/', label: 'Stories' },
  { href: '/spread/', label: 'Take Action' },
  { href: '/about/', label: 'About' },
];

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * @param {object} o
 * @param {string} o.title      page title, without the site suffix
 * @param {string} o.description
 * @param {string} o.path       absolute path, used for canonical + nav highlighting
 * @param {string} o.body       page HTML
 * @param {string} [o.ogType]
 * @param {string} [o.ogImage]  path to a generated OG image
 * @param {string[]} [o.scripts] extra module scripts to load
 * @param {string} [o.bodyClass]
 */
export function page({
  title,
  description,
  path,
  body,
  ogType = 'website',
  ogImage,
  scripts = [],
  bodyClass = '',
}) {
  const fullTitle = path === '/' ? `${SITE.name} — ${SITE.tagline}` : `${title} — ${SITE.name}`;
  const canonical = `${SITE.url}${path}`;
  const img = `${SITE.url}${ogImage || "/assets/og/default.png"}`;

  const nav = NAV.map((item) => {
    const current = item.href === path || (item.href !== '/' && path.startsWith(item.href));
    return `<li><a href="${item.href}"${current ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`;
  }).join('');

  const scriptTags = scripts
    .map((s) => `<script type="module" src="${s}" defer></script>`)
    .join('\n    ');

  // Only load Cloudflare's bot-protection widget on pages that actually have a form.
  const turnstile = body.includes('cf-turnstile')
    ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>'
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0f1419">

<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${img}">
<meta property="og:locale" content="${SITE.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">

<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} — Lyme disease news" href="/feed.xml">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body class="${esc(bodyClass)}">
<a class="skip-link" href="#main">Skip to main content</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <span class="brand-mark" aria-hidden="true"></span>
      <span class="brand-text"><strong>Lyme</strong> Accountability</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span class="nav-toggle-bar" aria-hidden="true"></span>
      <span class="sr-only">Menu</span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>${nav}</ul>
    </nav>
    <a class="btn btn-primary btn-sm header-cta" href="/petition/">Sign</a>
  </div>
</header>

<main id="main">
${body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-col">
        <p class="footer-brand"><strong>${esc(SITE.name)}</strong></p>
        <p class="muted">${esc(SITE.tagline)}</p>
        <p class="muted small">An independent volunteer project. Not affiliated with, endorsed by,
        or speaking for CDC, NIH, the Department of Defense, or any government agency.</p>
      </div>
      <nav class="footer-col" aria-label="Site">
        <h2 class="footer-head">Site</h2>
        <ul>${NAV.map((i) => `<li><a href="${i.href}">${esc(i.label)}</a></li>`).join('')}</ul>
      </nav>
      <nav class="footer-col" aria-label="Legal">
        <h2 class="footer-head">Legal</h2>
        <ul>
          <li><a href="/legal/privacy/">Privacy</a></li>
          <li><a href="/legal/terms/">Terms</a></li>
          <li><a href="/legal/disclaimer/">Disclaimer</a></li>
          <li><a href="/legal/sources/">Sources &amp; corrections</a></li>
        </ul>
      </nav>
      <div class="footer-col">
        <h2 class="footer-head">Data</h2>
        <ul>
          <li><a href="/feed.xml">News RSS</a></li>
          <li><a href="/data/cdc-lyme.json">Tracker data (JSON)</a></li>
          <li><a href="https://www.cdc.gov/lyme/data-research/facts-stats/surveillance-data-1.html" rel="noopener">CDC source data</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-legal">
      <p><strong>Not medical advice.</strong> Nothing on this site diagnoses, treats, or advises on
      any condition. Talk to a licensed clinician.</p>
      <p><strong>Not legal advice.</strong> The petition is a public petition and a registry of
      interested people. It is not a lawsuit, it is not a class action, and signing it does not make
      you a party to any legal proceeding or create an attorney&#8209;client relationship.</p>
      <p class="crisis">In crisis? Call or text <a href="tel:988">988</a> (US Suicide &amp; Crisis
      Lifeline), any time, free and confidential.</p>
      <p class="muted small">&copy; ${new Date().getFullYear()} ${esc(SITE.name)}. Case data from CDC,
      reproduced as a US Government work. Content licensed
      <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>.</p>
    </div>
  </div>
</footer>

${turnstile}
<script type="module" src="/assets/js/site.js" defer></script>
    ${scriptTags}
</body>
</html>`;
}

/* --------------------------------------------------------------- fragments */

export function disclaimerBox(kind = 'legal') {
  if (kind === 'legal') {
    return `
<aside class="callout callout--legal" role="note">
  <h2 class="callout-head">Before you sign, understand what this is</h2>
  <p>This is a <strong>public petition and a registry of interested individuals</strong>. It is not
  a lawsuit and it is not a class action. Signing does not make you a party to any legal proceeding
  and does not create an attorney&#8209;client relationship with anyone.</p>
  <p>Claims against the United States government face real barriers: sovereign immunity, the limits
  and exceptions of the Federal Tort Claims Act, and strict filing deadlines that can bar a claim
  before it is ever heard. No litigation can proceed unless licensed attorneys review individual
  claims and decide there is a viable case. <strong>Nothing here is legal advice.</strong></p>
  <p class="muted">What signatures actually do: they demonstrate scale to legislators and to the
  press, and they build a contactable record of affected people that counsel can evaluate if any
  firm takes this on.</p>
</aside>`.trim();
  }
  return `
<aside class="callout callout--medical" role="note">
  <p><strong>This is not medical advice.</strong> Personal accounts describe individual experiences
  and are published as submitted, subject to moderation. They are not treatment guidance and have
  not been medically verified. Talk to a licensed clinician about your own care.</p>
</aside>`.trim();
}

/** Evidence tier chip. The visual difference between these three is load-bearing. */
export function tier(kind) {
  const map = {
    documented: ['claim-documented', 'Documented', 'Primary sources, peer-reviewed research, declassified records or public law.'],
    contested: ['claim-contested', 'Under investigation', 'A real open question with official government activity behind it.'],
    allegation: ['claim-allegation', 'Allegation', 'A claim made in a book or in reporting that has not been substantiated.'],
  };
  const [cls, label, title] = map[kind];
  return `<span class="tier ${cls}" title="${esc(title)}">${esc(label)}</span>`;
}
