/**
 * GET /stories/<slug>/ — a single published story.
 *
 * Rendered server-side through the same layout as the static pages so the header,
 * footer and every disclaimer stay identical. Only status='approved' rows resolve;
 * a pending story 404s exactly like a nonexistent one.
 */
import { page, esc, disclaimerBox } from '../../src/layout.js';

/**
 * Pages Functions match before static assets, so this dynamic route would otherwise
 * swallow the hand-written pages that live under /stories/. Those names fall through.
 */
const RESERVED = new Set(['share', 'thanks', 'index', '']);

export async function onRequest({ params, request, env, next }) {
  const slug = String(params.slug || '').slice(0, 120);
  if (RESERVED.has(slug)) return next();
  if (!env.DB) return next();   // no database yet: fall through to the 404 asset

  const story = await env.DB.prepare(
    `SELECT id, slug, display_name, state, onset_year, title, body, approved_at
       FROM stories
      WHERE slug = ? AND status = 'approved'`
  ).bind(slug).first();

  if (!story) {
    const url = new URL(request.url);
    const notFound = await env.ASSETS.fetch(new Request(`${url.origin}/404.html`));
    return new Response(notFound.body, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const { results: media } = await env.DB.prepare(
    `SELECT r2_key, alt_text FROM story_media WHERE story_id = ? LIMIT 3`
  ).bind(story.id).all();

  // User-submitted text: escaped, then only paragraph breaks are restored. No HTML
  // from a submitter ever reaches the page.
  const paragraphs = esc(story.body)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  const images = (media || [])
    .map(
      (m) =>
        `<figure class="story-figure"><img src="/media/${esc(m.r2_key)}" alt="${esc(m.alt_text || 'Photo submitted with this story')}" loading="lazy"></figure>`
    )
    .join('');

  const meta = [
    story.state,
    story.onset_year ? `symptoms began ${story.onset_year}` : null,
  ].filter(Boolean).map(esc).join(' &middot; ');

  const body = `
<section class="page-head">
  <div class="wrap narrow">
    <p class="eyebrow"><a href="/stories/">Stories</a></p>
    <h1>${esc(story.title)}</h1>
    <p class="lede">${esc(story.display_name)}${meta ? ` &middot; ${meta}` : ''}</p>
  </div>
</section>

<section class="section">
  <div class="wrap narrow">
    <article class="prose story-full">${paragraphs}${images}</article>

    <div class="share-row" data-share-scope data-share-url="${esc(env.SITE_URL || '')}/stories/${esc(story.slug)}/">
      <span class="muted small">Share this:</span>
      <a class="btn btn-ghost btn-sm" data-share="x" href="#" rel="noopener">X</a>
      <a class="btn btn-ghost btn-sm" data-share="facebook" href="#" rel="noopener">Facebook</a>
      <a class="btn btn-ghost btn-sm" data-share="email" href="#">Email</a>
    </div>

    ${disclaimerBox('medical')}

    <div class="hero-actions">
      <a class="btn btn-primary" href="/petition/">Sign the petition</a>
      <a class="btn btn-ghost" href="/stories/share/">Share your own story</a>
    </div>
  </div>
</section>`;

  const html = page({
    title: story.title,
    description: `${story.display_name}: ${story.body.slice(0, 150).trim()}…`,
    path: `/stories/${story.slug}/`,
    ogType: 'article',
    ogImage: '/assets/og/stories.png',
    body,
  });

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  });
}
