/**
 * The news engine.
 *
 * Every source here is a public API or a published feed, queried with a descriptive
 * User-Agent and a contact URL. We store headline, source, date, canonical link and our
 * own one-sentence summary — never article text. The click belongs to the publisher.
 *
 * Adding a source: return items shaped { url, title, summary, source, sourceKind,
 * category, publishedAt }. Everything after that (dedupe, scoring, storage) is common.
 */

const UA = 'LymeAccountabilityProject/1.0 (+https://lyme.etrenzik.com/about/; news aggregator)';
const TIMEOUT_MS = 12000;

async function get(url, { headers = {}, json: wantJson = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: wantJson ? 'application/json' : '*/*', ...headers },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return wantJson ? await res.json() : await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------------------------------------- XML helpers */

/** Minimal feed parsing. Workers have no DOMParser and feeds are shallow enough. */
const decodeEntities = (s) =>
  String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
};

function parseFeed(xml, { source, category, sourceKind = 'rss' }) {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  return blocks
    .map((block) => {
      let link = tag(block, 'link');
      if (!link) {
        const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
        link = href ? decodeEntities(href[1]) : '';
      }
      const title = tag(block, 'title');
      if (!title || !link) return null;
      return {
        url: link,
        title,
        summary: tag(block, 'description') || tag(block, 'summary') || '',
        source,
        sourceKind,
        category,
        publishedAt:
          tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || null,
      };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------- utilities */

/**
 * Google News wraps every link in a redirect. Recover the publisher URL where we can,
 * and keep the wrapper otherwise rather than dropping the item.
 */
function unwrapGoogle(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('news.google.com')) return url;
    const inner = u.searchParams.get('url');
    return inner ? inner : url;
  } catch {
    return url;
  }
}

/** Strips tracking parameters so the same story from two feeds hashes identically. */
export function canonical(url) {
  try {
    const u = new URL(unwrapGoogle(url));
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref|source|oc$)/i.test(key)) u.searchParams.delete(key);
    }
    u.hash = '';
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch {
    return url;
  }
}

const isoDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
};

/** Our own one-sentence summary. Never more than a sentence of the source's text. */
function summarise(text, max = 220) {
  const clean = decodeEntities(text || '');
  if (!clean) return '';
  const firstSentence = clean.match(/^.*?[.!?](?:\s|$)/);
  const out = (firstSentence ? firstSentence[0] : clean).trim();
  return out.length > max ? `${out.slice(0, max - 1).trimEnd()}…` : out;
}

/* ------------------------------------------------------------- the sources */

async function pubmed() {
  const term =
    '("lyme disease"[Title/Abstract] OR "borrelia burgdorferi"[Title/Abstract] OR ' +
    '"post-treatment lyme"[Title/Abstract])';
  const search = await get(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=30&sort=date&reldate=45&datetype=pdat&term=${encodeURIComponent(term)}`,
    { json: true }
  );
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summary = await get(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`,
    { json: true }
  );

  return ids
    .map((id) => summary?.result?.[id])
    .filter(Boolean)
    .map((r) => ({
      url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
      title: r.title || '',
      summary: r.fulljournalname ? `${r.fulljournalname}. ${r.sortfirstauthor || ''}`.trim() : '',
      source: 'PubMed',
      sourceKind: 'pubmed',
      category: 'research',
      publishedAt: r.sortpubdate || r.pubdate || null,
    }))
    .filter((r) => r.title);
}

async function clinicalTrials() {
  const data = await get(
    'https://clinicaltrials.gov/api/v2/studies?query.cond=Lyme+Disease&sort=LastUpdatePostDate:desc&pageSize=15&fields=NCTId,BriefTitle,OverallStatus,LastUpdatePostDate,LeadSponsorName',
    { json: true }
  );
  return (data?.studies || [])
    .map((s) => {
      const id = s?.protocolSection?.identificationModule?.nctId;
      const title = s?.protocolSection?.identificationModule?.briefTitle;
      if (!id || !title) return null;
      const status = s?.protocolSection?.statusModule?.overallStatus || '';
      const sponsor = s?.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || '';
      return {
        url: `https://clinicaltrials.gov/study/${id}`,
        title,
        summary: [status, sponsor].filter(Boolean).join(' · '),
        source: 'ClinicalTrials.gov',
        sourceKind: 'trials',
        category: 'research',
        publishedAt: s?.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date || null,
      };
    })
    .filter(Boolean);
}

async function federalRegister() {
  const data = await get(
    'https://www.federalregister.gov/api/v1/documents.json?per_page=15&order=newest&conditions[term]=' +
      encodeURIComponent('lyme disease') +
      '&fields[]=title&fields[]=html_url&fields[]=publication_date&fields[]=agencies&fields[]=abstract',
    { json: true }
  );
  return (data?.results || []).map((d) => ({
    url: d.html_url,
    title: d.title,
    summary: summarise(d.abstract || ''),
    source: (d.agencies && d.agencies[0]?.name) || 'Federal Register',
    sourceKind: 'fedreg',
    category: 'policy',
    publishedAt: d.publication_date,
  }));
}

async function congress(env) {
  if (!env.CONGRESS_API_KEY) return [];       // optional source; skipped without a key
  const data = await get(
    `https://api.congress.gov/v3/bill?format=json&limit=20&sort=updateDate+desc&api_key=${env.CONGRESS_API_KEY}`,
    { json: true }
  );
  return (data?.bills || [])
    .filter((b) => /lyme|tick-?borne/i.test(b.title || ''))
    .map((b) => ({
      url: b.url?.replace('api.congress.gov/v3', 'www.congress.gov') || 'https://www.congress.gov',
      title: `${b.type}${b.number}: ${b.title}`,
      summary: b.latestAction?.text ? summarise(b.latestAction.text) : '',
      source: 'Congress.gov',
      sourceKind: 'congress',
      category: 'policy',
      publishedAt: b.updateDate || null,
    }));
}

async function gdelt() {
  const data = await get(
    'https://api.gdeltproject.org/api/v2/doc/doc?query=%22lyme%20disease%22&mode=artlist&maxrecords=30&format=json&sort=datedesc&timespan=3d',
    { json: true }
  );
  return (data?.articles || []).map((a) => ({
    url: a.url,
    title: a.title || '',
    summary: '',
    source: a.domain || 'News',
    sourceKind: 'gdelt',
    category: 'general',
    publishedAt: a.seendate
      ? `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}`
      : null,
  }));
}

const FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=%22Lyme+disease%22&hl=en-US&gl=US&ceid=US:en',
    source: 'Google News',
    category: 'general',
    sourceKind: 'gnews',
  },
  {
    url: 'https://tools.cdc.gov/api/v2/resources/media/404952.rss',
    source: 'CDC',
    category: 'surveillance',
  },
  {
    url: 'https://www.niaid.nih.gov/rss/news-releases.xml',
    source: 'NIAID',
    category: 'research',
  },
  {
    url: 'https://www.lymedisease.org/feed/',
    source: 'LymeDisease.org',
    category: 'community',
  },
];

async function feeds() {
  const out = [];
  for (const f of FEEDS) {
    try {
      const xml = await get(f.url);
      out.push(...parseFeed(xml, f));
    } catch (err) {
      console.warn(`[news] feed failed ${f.source}: ${err.message}`);
    }
  }
  return out;
}

/* --------------------------------------------------------------- scoring */

const KEYWORDS = [
  [/\blyme\b/i, 10],
  [/\bborrelia\b/i, 9],
  [/\btick-?borne\b/i, 6],
  [/\bchronic lyme\b/i, 6],
  [/\bPTLDS\b/i, 6],
  [/\bbabesi/i, 4],
  [/\banaplasm/i, 3],
  [/\balpha-?gal\b/i, 3],
  [/\bixodes\b/i, 4],
  [/\berythema migrans\b/i, 4],
  [/\bticks?\b/i, 2],
];

const AUTHORITY = {
  pubmed: 6, trials: 5, congress: 6, fedreg: 5, rss: 3, gnews: 1, gdelt: 0,
};

const SCORE_THRESHOLD = 10;

function score(item) {
  const haystack = `${item.title} ${item.summary}`;
  let s = 0;
  for (const [re, weight] of KEYWORDS) if (re.test(haystack)) s += weight;

  s += AUTHORITY[item.sourceKind] ?? 0;

  // Recency decay: a month-old item is worth roughly half a fresh one.
  if (item.publishedAt) {
    const age = (Date.now() - new Date(item.publishedAt).getTime()) / 86400000;
    if (Number.isFinite(age) && age >= 0) s += Math.max(0, 6 - age / 6);
  }

  // A headline that never says Lyme or Borrelia is almost always a false positive.
  if (!/\blyme\b|\bborrelia\b/i.test(item.title)) s -= 6;

  return Math.round(s * 10) / 10;
}

/* --------------------------------------------------------------- dedupe */

export const normaliseTitle = (title) =>
  String(title)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|of|in|on|for|to|and|with|new|study|says|report)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Trigram Jaccard similarity. Cheap, and good enough to catch wire-copy duplicates. */
export function similarity(a, b) {
  const grams = (s) => {
    const set = new Set();
    const padded = ` ${s} `;
    for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / (A.size + B.size - shared);
}

/* ------------------------------------------------------------- the runner */

export async function collect(env) {
  const tasks = [
    ['pubmed', pubmed()],
    ['trials', clinicalTrials()],
    ['fedreg', federalRegister()],
    ['congress', congress(env)],
    ['gdelt', gdelt()],
    ['feeds', feeds()],
  ];

  const items = [];
  const failures = [];

  for (const [name, promise] of tasks) {
    try {
      items.push(...(await promise));
    } catch (err) {
      failures.push(`${name}: ${err.message}`);
      console.warn(`[news] source failed ${name}: ${err.message}`);
    }
  }

  // Normalise, score, and drop the obvious noise before it ever reaches the database.
  const prepared = items
    .map((item) => {
      const url = canonical(item.url);
      return {
        ...item,
        url,
        title: decodeEntities(item.title).slice(0, 300),
        summary: summarise(item.summary),
        titleNorm: normaliseTitle(item.title),
        publishedAt: isoDate(item.publishedAt),
      };
    })
    .filter((i) => i.url && i.title && i.titleNorm.length > 8)
    .map((i) => ({ ...i, score: score(i) }))
    .sort((a, b) => b.score - a.score);

  // In-batch near-duplicate removal: the wire, Google News and GDELT all carry the
  // same story under slightly different headlines.
  const kept = [];
  for (const item of prepared) {
    const dupe = kept.find((k) => similarity(k.titleNorm, item.titleNorm) >= 0.85);
    if (!dupe) kept.push(item);
  }

  return { items: kept, failures };
}

export { SCORE_THRESHOLD };
