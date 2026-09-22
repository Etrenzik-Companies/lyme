/**
 * /api/me?t=<manage token> — self-service data export and deletion.
 *
 * Available to everyone, not only California or EU residents. Delete means DELETE: the
 * row is removed, not flagged. The token arrives in the person's own confirmation email
 * and is the only credential — which is why it is compared in constant time and why this
 * endpoint is rate limited.
 *
 *   GET  ?t=…            a small self-contained page with both options
 *   GET  ?t=…&format=json  the export
 *   POST ?t=…            body {action:'delete'}
 */
import { json, fail, rateLimited, clientIp } from '../../lib/http.js';
import { decrypt } from '../../lib/crypto.js';

async function lookup(env, t) {
  const sig = await env.DB.prepare(
    `SELECT id, created_at, verified, first_name, last_initial, state, relationship,
            years_affected, statement, consent_public, consent_contact, email_enc
       FROM signatures WHERE manage_token = ?`
  ).bind(t).first();
  if (sig) return { kind: 'signature', row: sig };

  const story = await env.DB.prepare(
    `SELECT id, created_at, status, display_name, state, onset_year, title, body,
            consent_publish, consent_social, slug, email_enc
       FROM stories WHERE manage_token = ?`
  ).bind(t).first();
  if (story) return { kind: 'story', row: story };

  return null;
}

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(title, inner) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="stylesheet" href="/assets/css/site.css"></head>
<body><main id="main"><section class="page-head"><div class="wrap narrow">${inner}</div></section></main>
<script type="module" src="/assets/js/manage.js" defer></script></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } }
  );
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const t = url.searchParams.get('t');

  if (await rateLimited(env, `me:${clientIp(request)}`, { limit: 20, windowSec: 3600 })) {
    return fail('Too many requests. Try again shortly.', 429);
  }
  if (!t) return fail('Missing token.', 400);

  const found = await lookup(env, t);
  if (!found) {
    return page(
      'Link not recognised',
      `<h1>That link is not valid</h1>
       <p class="lede">It may have already been used to delete the record, or it may have been
       mistyped. If you still have the original email, try the link again from there.</p>
       <p><a class="btn btn-ghost" href="/">Back to the site</a></p>`
    );
  }

  const { kind, row } = found;

  /* ------------------------------------------------------------- delete */
  if (request.method === 'POST') {
    const table = kind === 'signature' ? 'signatures' : 'stories';

    if (kind === 'story' && env.MEDIA) {
      const { results } = await env.DB.prepare(
        `SELECT r2_key FROM story_media WHERE story_id = ?`
      ).bind(row.id).all();
      for (const m of results || []) {
        try { await env.MEDIA.delete(m.r2_key); } catch { /* already gone */ }
      }
    }

    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(row.id).run();
    return json({ ok: true, deleted: kind });
  }

  /* ------------------------------------------------------------- export */
  if (url.searchParams.get('format') === 'json') {
    let email = null;
    try { email = await decrypt(env, row.email_enc); } catch { /* key rotated */ }
    const { email_enc, ...rest } = row;
    return json(
      { type: kind, exported_at: new Date().toISOString(), data: { ...rest, email } },
      200,
      { 'content-disposition': `attachment; filename="my-data-${kind}.json"` }
    );
  }

  /* --------------------------------------------------------------- page */
  const summary =
    kind === 'signature'
      ? `<li><strong>Signed</strong> ${esc(row.created_at)}</li>
         <li><strong>Status</strong> ${row.verified ? 'verified and counted' : 'awaiting email confirmation'}</li>
         <li><strong>Name shown</strong> ${esc(row.first_name)} ${esc(row.last_initial)}.</li>
         <li><strong>State</strong> ${esc(row.state)}</li>
         <li><strong>Public on the wall</strong> ${row.consent_public ? 'yes' : 'no'}</li>`
      : `<li><strong>Submitted</strong> ${esc(row.created_at)}</li>
         <li><strong>Status</strong> ${esc(row.status)}</li>
         <li><strong>Title</strong> ${esc(row.title)}</li>
         <li><strong>Shown as</strong> ${esc(row.display_name)}</li>`;

  return page(
    'Your data',
    `<h1>Your data</h1>
     <ul class="plain-list">${summary}</ul>
     <p class="muted small">Your email address is stored encrypted and is never published or shared.</p>
     <div class="hero-actions">
       <a class="btn btn-ghost" href="/api/me?t=${encodeURIComponent(t)}&amp;format=json">Download everything (JSON)</a>
       <button class="btn btn-primary" type="button" data-delete data-token="${esc(t)}">Delete it permanently</button>
     </div>
     <p class="form-status" role="status" aria-live="polite"></p>
     <p class="muted small">Deletion is immediate and cannot be undone. ${
       kind === 'signature' ? 'Your signature will be removed from the count.' : 'Your story will be removed from the site.'
     }</p>`
  );
}
