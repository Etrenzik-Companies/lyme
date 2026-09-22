/**
 * Shared request/response helpers for the Pages Functions.
 *
 * Lives outside functions/ on purpose: everything inside functions/ becomes a route,
 * and these are libraries, not endpoints.
 */

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });

export const fail = (message, status = 400) => json({ error: message }, status);

export const methodGuard = (request, ...allowed) =>
  allowed.includes(request.method)
    ? null
    : json({ error: 'Method not allowed' }, 405, { allow: allowed.join(', ') });

/** Parses JSON or form-encoded bodies into a plain object. */
export async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try { return await request.json(); } catch { return {}; }
  }
  if (type.includes('form')) {
    return Object.fromEntries((await request.formData()).entries());
  }
  return {};
}

export const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));

export const str = (v, max = 255) => String(v ?? '').trim().slice(0, max);

export const isEmail = (v) =>
  typeof v === 'string' && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);

/**
 * KV-backed sliding-window rate limit.
 * Returns true when the caller is over budget.
 */
export async function rateLimited(env, key, { limit = 5, windowSec = 3600 } = {}) {
  if (!env.KV) return false;                       // local dev without a KV binding
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const current = Number((await env.KV.get(bucket)) || 0);
  if (current >= limit) return true;
  await env.KV.put(bucket, String(current + 1), { expirationTtl: windowSec + 60 });
  return false;
}

/**
 * Shared spam gate for both public forms: honeypot, minimum time-on-form, and
 * Turnstile. Returns an error string, or null when the submission looks human.
 */
export async function screenSubmission(env, request, body, { minSeconds = 3 } = {}) {
  if (str(body.website)) return 'Submission rejected.';        // honeypot

  const started = Number(body.started_at || 0);
  if (started && Date.now() - started < minSeconds * 1000) {
    return 'That was submitted too quickly. Please try again.';
  }

  const ok = await verifyTurnstile(env, body['cf-turnstile-response'], clientIp(request));
  if (!ok) return 'Verification failed. Please complete the checkbox and try again.';

  return null;
}

export const clientIp = (request) =>
  request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '0.0.0.0';

/** Server-side Turnstile verification. The client token alone proves nothing. */
export async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;          // not configured yet in local dev
  if (!token) return false;

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
