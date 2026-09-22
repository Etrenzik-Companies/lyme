/**
 * GET /api/wall — the public signature wall.
 *
 * Three conditions must all hold for a row to appear: verified, consented to be public,
 * and not hidden by a moderator. Emails are not in the SELECT at all, so there is no way
 * for a future edit to leak one by accident.
 */
import { json, methodGuard, clamp } from '../../lib/http.js';
import { RELATIONSHIPS } from '../../lib/constants.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET');
  if (bad) return bad;

  const url = new URL(request.url);
  const limit = clamp(url.searchParams.get('limit') || 36, 1, 60);
  const offset = clamp(url.searchParams.get('offset') || 0, 0, 100000);

  if (!env.DB) return json({ signatures: [], unconfigured: true });

  const { results } = await env.DB.prepare(
    `SELECT first_name, last_initial, state, relationship, statement, created_at
       FROM signatures
      WHERE verified = 1 AND consent_public = 1 AND moderation_state = 'ok'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all();

  return json(
    {
      signatures: (results || []).map((r) => ({
        name: `${r.first_name} ${r.last_initial}.`,
        state: r.state,
        relationship: RELATIONSHIPS[r.relationship] || '',
        statement: r.statement || '',
        created_at: r.created_at,
      })),
    },
    200,
    { 'cache-control': 'public, max-age=120' }
  );
}
