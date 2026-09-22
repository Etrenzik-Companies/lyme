/**
 * /api/admin/social — the approval gate in front of every outbound post.
 *
 *   GET  ?status=pending      list drafts
 *   POST {id, action, body}   approve (posts immediately) | reject
 *
 * A draft only reaches a platform by way of a human pressing approve here. The cron
 * worker writes drafts; it never publishes one on its own.
 */
import { json, fail, methodGuard, readBody, str, clamp } from '../../../lib/http.js';
import { verifyAccess, logAction } from '../../../lib/access.js';
import { publish, fits, limitFor } from '../../../lib/social.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET', 'POST');
  if (bad) return bad;

  const auth = await verifyAccess(request, env);
  if (!auth.ok) return fail(auth.reason, 403);

  /* ------------------------------------------------------------------ list */
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const status = str(url.searchParams.get('status') || 'pending', 24);
    const limit = clamp(url.searchParams.get('limit') || 50, 1, 100);

    // Sweep anything that sat unapproved past its window. Expiring beats posting late.
    await env.DB.prepare(
      `UPDATE social_queue SET status = 'expired'
        WHERE status = 'pending' AND expires_at < datetime('now')`
    ).run();

    const { results } = await env.DB.prepare(
      `SELECT id, created_at, expires_at, platform, kind, body, link, status, error
         FROM social_queue
        WHERE status = ?
        ORDER BY created_at ASC
        LIMIT ?`
    )
      .bind(status, limit)
      .all();

    return json({ drafts: results || [] });
  }

  /* ---------------------------------------------------------------- action */
  const { id, action, body } = await readBody(request);
  const draftId = Number(id);
  if (!draftId) return fail('Missing draft id.');

  const draft = await env.DB.prepare(
    `SELECT id, platform, kind, body, link, status FROM social_queue WHERE id = ?`
  ).bind(draftId).first();
  if (!draft) return fail('Draft not found.', 404);
  if (draft.status !== 'pending') return fail(`This draft is already ${draft.status}.`);

  if (action === 'reject') {
    await env.DB.prepare(`UPDATE social_queue SET status = 'rejected' WHERE id = ?`)
      .bind(draftId)
      .run();
    await logAction(env, { actor: auth.email, entity: 'social', entityId: draftId, action: 'rejected' });
    return json({ ok: true, status: 'rejected' });
  }

  if (action !== 'approve') return fail('Unknown action.');

  // The moderator may have edited the text in the console; that edit is what posts.
  const finalBody = str(body ?? draft.body, 10000);
  if (!finalBody.trim()) return fail('Post text is empty.');
  if (!fits(draft.platform, finalBody, draft.link)) {
    return fail(`Too long for ${draft.platform}: limit is ${limitFor(draft.platform)} characters.`);
  }

  await env.DB.prepare(
    `UPDATE social_queue
        SET body = ?, status = 'approved', approved_by = ?, approved_at = datetime('now')
      WHERE id = ?`
  )
    .bind(finalBody, auth.email, draftId)
    .run();

  await logAction(env, { actor: auth.email, entity: 'social', entityId: draftId, action: 'approved' });

  try {
    const externalId = await publish(env, { ...draft, body: finalBody, status: 'approved' });
    await env.DB.prepare(
      `UPDATE social_queue
          SET status = 'posted', posted_at = datetime('now'), external_id = ?, error = NULL
        WHERE id = ?`
    )
      .bind(externalId, draftId)
      .run();
    return json({ ok: true, status: 'posted', external_id: externalId });
  } catch (err) {
    // Retryable failures stay approved so the worker can pick them up; permanent ones
    // are marked failed and stay visible in the console.
    const status = err.retryable ? 'approved' : 'failed';
    await env.DB.prepare(
      `UPDATE social_queue SET status = ?, error = ?, attempts = attempts + 1 WHERE id = ?`
    )
      .bind(status, String(err.message).slice(0, 500), draftId)
      .run();
    return fail(
      err.retryable
        ? `Rate limited by the platform. Kept as approved — the worker will post it on the next run.`
        : err.message,
      502
    );
  }
}
