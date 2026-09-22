/**
 * /api/admin/stories — the moderation queue.
 *
 *   GET  ?status=pending   list submissions
 *   POST {id, action, note} approve | reject | changes
 *
 * Approving is the only thing that makes a story public, and only a human hitting this
 * endpoint behind Cloudflare Access can do it.
 */
import { json, fail, methodGuard, readBody, str, clamp } from '../../../lib/http.js';
import { verifyAccess, logAction } from '../../../lib/access.js';
import { decrypt } from '../../../lib/crypto.js';
import { sendStoryPublished } from '../../../lib/email.js';

const STATUSES = ['pending', 'approved', 'rejected', 'changes_requested'];

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET', 'POST');
  if (bad) return bad;

  const auth = await verifyAccess(request, env);
  if (!auth.ok) return fail(auth.reason, 403);

  /* ------------------------------------------------------------------ list */
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const status = str(url.searchParams.get('status') || 'pending', 24);
    if (!STATUSES.includes(status)) return fail('Unknown status.');
    const limit = clamp(url.searchParams.get('limit') || 50, 1, 100);

    const { results } = await env.DB.prepare(
      `SELECT id, slug, created_at, display_name, state, onset_year, title, body,
              consent_social, pii_flags, status
         FROM stories
        WHERE status = ?
        ORDER BY created_at ASC
        LIMIT ?`
    )
      .bind(status, limit)
      .all();

    return json({
      stories: (results || []).map((s) => ({
        ...s,
        pii_flags: s.pii_flags ? JSON.parse(s.pii_flags) : [],
      })),
    });
  }

  /* ---------------------------------------------------------------- action */
  const { id, action, note } = await readBody(request);
  const storyId = Number(id);
  if (!storyId) return fail('Missing story id.');

  const story = await env.DB.prepare(
    `SELECT id, slug, title, email_enc, status FROM stories WHERE id = ?`
  ).bind(storyId).first();
  if (!story) return fail('Story not found.', 404);

  const map = {
    approve: 'approved',
    reject: 'rejected',
    changes: 'changes_requested',
  };
  const next = map[action];
  if (!next) return fail('Unknown action.');

  await env.DB.prepare(
    `UPDATE stories
        SET status = ?,
            approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END,
            moderator_note = ?
      WHERE id = ?`
  )
    .bind(next, next, str(note, 500) || null, storyId)
    .run();

  await logAction(env, {
    actor: auth.email,
    entity: 'story',
    entityId: storyId,
    action: next,
    note: str(note, 500),
  });

  // Tell the author what happened. Silence after someone shares the worst years of
  // their life is its own kind of harm.
  if (next === 'approved' && story.email_enc) {
    try {
      const site = env.SITE_URL || new URL(request.url).origin;
      const email = await decrypt(env, story.email_enc);
      const manage = await env.DB.prepare(`SELECT manage_token FROM stories WHERE id = ?`)
        .bind(storyId)
        .first();
      await sendStoryPublished(env, {
        to: email,
        storyUrl: `${site}/stories/${story.slug}/`,
        manageUrl: `${site}/api/me?t=${encodeURIComponent(manage.manage_token)}`,
      });
    } catch (err) {
      console.error('[admin/stories] notify failed:', err.message);
    }
  }

  return json({ ok: true, status: next });
}
