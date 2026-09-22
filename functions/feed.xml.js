/**
 * GET /feed.xml — RSS 2.0 for the aggregated news feed.
 *
 * Titles, sources, dates and links only. No article text is republished: the click
 * belongs to the publisher.
 */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const rfc822 = (value) => {
  if (!value) return new Date().toUTCString();
  const d = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
};

export async function onRequest({ request, env }) {
  const site = env.SITE_URL || new URL(request.url).origin;
  const name = env.SITE_NAME || 'The Lyme Accountability Project';

  let items = [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT url, title, summary, source, category, published_at, fetched_at
         FROM news_items
        WHERE hidden = 0 AND confidence = 'normal'
        ORDER BY COALESCE(published_at, fetched_at) DESC
        LIMIT 50`
    ).all();
    items = results || [];
  } catch (err) {
    console.error('[feed]', err.message);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(name)} — Lyme disease news</title>
  <link>${esc(site)}/news/</link>
  <atom:link href="${esc(site)}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Aggregated Lyme disease news from PubMed, ClinicalTrials.gov, Congress.gov, the Federal Register, CDC, NIH, patient organisations and the news wire. Updated every six hours.</description>
  <language>en-us</language>
  <lastBuildDate>${rfc822(items[0]?.fetched_at)}</lastBuildDate>
  <ttl>360</ttl>
${items
  .map(
    (i) => `  <item>
    <title>${esc(i.title)}</title>
    <link>${esc(i.url)}</link>
    <guid isPermaLink="true">${esc(i.url)}</guid>
    <pubDate>${rfc822(i.published_at || i.fetched_at)}</pubDate>
    <source url="${esc(site)}/news/">${esc(i.source)}</source>
    <category>${esc(i.category)}</category>
    <description>${esc(i.summary || i.title)}</description>
  </item>`
  )
  .join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=1800',
    },
  });
}
