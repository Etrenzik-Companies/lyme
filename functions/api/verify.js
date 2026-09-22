/**
 * GET /api/verify?t=… — completes the double opt-in and redirects to a confirmation page.
 *
 * Only after this runs does a signature count anywhere public.
 */
import { fail, methodGuard, requireDb } from '../../lib/http.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET');
  if (bad) return bad;

  const noDb = requireDb(env, { readOnly: true });
  if (noDb) return noDb;

  const url = new URL(request.url);
  const t = url.searchParams.get('t');
  const site = env.SITE_URL || url.origin;

  if (!t) return Response.redirect(`${site}/petition/?error=missing-token`, 302);

  const row = await env.DB.prepare(
    `SELECT id, verified FROM signatures WHERE verify_token = ?`
  ).bind(t).first();

  // Already-verified links stay idempotent so a second click is not an error.
  if (!row) return Response.redirect(`${site}/petition/?error=invalid-token`, 302);
  if (row.verified) return Response.redirect(`${site}/petition/verified/`, 302);

  // The token is deliberately kept rather than cleared. People re-click confirmation
  // links, forward them, and open them on a second device; clearing it would turn a
  // harmless second click into "invalid token" and make a signer think they failed.
  // Its only power is to set verified = 1, which is already done.
  await env.DB.prepare(
    `UPDATE signatures SET verified = 1, verified_at = datetime('now') WHERE id = ?`
  ).bind(row.id).run();

  return Response.redirect(`${site}/petition/verified/`, 302);
}
