/**
 * /api/admin/signatures — review the public statements on the signature wall.
 *
 * Hiding a statement never changes the count. The number and the moderation of what
 * appears beside it are deliberately separate: a moderator should never have a reason
 * to touch the total.
 */
import { json, fail, methodGuard, readBody, str, clamp } from '../../../lib/http.js';
import { verifyAccess, logAction } from '../../../lib/access.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET', 'POST');
  if (bad) return bad;

  const auth = await verifyAccess(request, env);
  if (!auth.ok) return fail(auth.reason, 403);

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const limit = clamp(url.searchParams.get('limit') || 50, 1, 100);

    const { results } = await env.DB.prepare(
      `SELECT id, first_name, last_initial, state, statement, created_at
         FROM signatures
        WHERE verified = 1
          AND consent_public = 1
          AND statement IS NOT NULL
          AND moderation_state = 'ok'
        ORDER BY created_at DESC
        LIMIT ?`
    )
      .bind(limit)
      .all();

    return json({
      signatures: (results || []).map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_initial}.`,
        state: s.state,
        statement: s.statement,
        created_at: s.created_at,
      })),
    });
  }

  const { id, action, note } = await readBody(request);
  const sigId = Number(id);
  if (!sigId) return fail('Missing signature id.');
  if (!['hide', 'unhide'].includes(action)) return fail('Unknown action.');

  await env.DB.prepare(`UPDATE signatures SET moderation_state = ? WHERE id = ?`)
    .bind(action === 'hide' ? 'hidden' : 'ok', sigId)
    .run();

  await logAction(env, {
    actor: auth.email,
    entity: 'signature',
    entityId: sigId,
    action,
    note: str(note, 500),
  });

  return json({ ok: true });
}
