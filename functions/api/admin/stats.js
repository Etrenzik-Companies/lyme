/** GET /api/admin/stats — moderation dashboard counters. */
import { json, fail, methodGuard } from '../../../lib/http.js';
import { verifyAccess } from '../../../lib/access.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET');
  if (bad) return bad;

  const auth = await verifyAccess(request, env);
  if (!auth.ok) return fail(auth.reason, 403);

  const one = async (sql) => (await env.DB.prepare(sql).first())?.n ?? 0;

  return json({
    actor: auth.email,
    signatures_verified: await one(`SELECT COUNT(*) AS n FROM signatures WHERE verified = 1`),
    signatures_pending: await one(`SELECT COUNT(*) AS n FROM signatures WHERE verified = 0`),
    signatures_flagged: await one(
      `SELECT COUNT(*) AS n FROM signatures
        WHERE verified = 1 AND consent_public = 1 AND statement IS NOT NULL AND moderation_state = 'ok'`
    ),
    stories_pending: await one(`SELECT COUNT(*) AS n FROM stories WHERE status = 'pending'`),
    stories_approved: await one(`SELECT COUNT(*) AS n FROM stories WHERE status = 'approved'`),
    social_pending: await one(`SELECT COUNT(*) AS n FROM social_queue WHERE status = 'pending'`),
    news_last_24h: await one(
      `SELECT COUNT(*) AS n FROM news_items WHERE fetched_at >= datetime('now', '-24 hours')`
    ),
  });
}
