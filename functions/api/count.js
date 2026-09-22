/**
 * GET /api/count — the public signature counter.
 *
 * Returns verified totals only, and nothing that could identify anybody. This endpoint
 * must never grow fields: it is the one the whole internet can hammer.
 */
import { json, methodGuard } from '../../lib/http.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET');
  if (bad) return bad;

  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS verified, COUNT(DISTINCT state) AS states
       FROM signatures
      WHERE verified = 1`
  ).first();

  return json(
    {
      verified: row?.verified ?? 0,
      states_represented: row?.states ?? 0,
      updated_at: new Date().toISOString(),
    },
    200,
    { 'cache-control': 'public, max-age=60' }
  );
}
