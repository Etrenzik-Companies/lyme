/** POST /api/admin/social/draft — queue a custom post written by a human. */
import { json, fail, methodGuard, readBody, str } from '../../../../lib/http.js';
import { verifyAccess, logAction } from '../../../../lib/access.js';
import { fits, limitFor } from '../../../../lib/social.js';
import { SOCIAL_DRAFT_TTL_HOURS } from '../../../../lib/constants.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'POST');
  if (bad) return bad;

  const auth = await verifyAccess(request, env);
  if (!auth.ok) return fail(auth.reason, 403);

  const { body, platform, link, kind } = await readBody(request);
  const text = str(body, 10000).trim();
  const plat = str(platform, 20).toLowerCase();

  if (!text) return fail('Post text is required.');
  if (!['x', 'facebook'].includes(plat)) return fail('Platform must be x or facebook.');
  if (!fits(plat, text, link)) {
    return fail(`Too long for ${plat}: limit is ${limitFor(plat)} characters.`);
  }

  // Even a hand-written draft lands as pending. One person writing and the same person
  // approving is still two deliberate actions, and the audit log records both.
  const result = await env.DB.prepare(
    `INSERT INTO social_queue (platform, kind, body, link, status, expires_at)
     VALUES (?, ?, ?, ?, 'pending', datetime('now', ?))`
  )
    .bind(plat, str(kind, 20) || 'manual', text, str(link, 500) || null, `+${SOCIAL_DRAFT_TTL_HOURS} hours`)
    .run();

  await logAction(env, {
    actor: auth.email,
    entity: 'social',
    entityId: result.meta.last_row_id,
    action: 'drafted',
  });

  return json({ ok: true, id: result.meta.last_row_id });
}
