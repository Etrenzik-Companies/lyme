/**
 * Cloudflare Access verification for /api/admin/*.
 *
 * There is deliberately no password login anywhere in this project. Access sits in front
 * of the admin routes, and this module verifies the JWT it forwards so a request that
 * somehow reaches the Function directly still gets rejected.
 *
 * Required vars: ACCESS_TEAM_DOMAIN (e.g. "etrenzik.cloudflareaccess.com")
 *                ACCESS_AUD        (the Application Audience tag from the Access app)
 */

const JWKS_TTL_MS = 60 * 60 * 1000;
let jwksCache = { keys: null, fetchedAt: 0, domain: '' };

const b64urlToBytes = (s) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const b64urlToJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function getKeys(env) {
  const domain = env.ACCESS_TEAM_DOMAIN;
  const fresh = jwksCache.keys && jwksCache.domain === domain && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh) return jwksCache.keys;

  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`could not fetch Access certs: ${res.status}`);
  const { keys } = await res.json();
  jwksCache = { keys, fetchedAt: Date.now(), domain };
  return keys;
}

/**
 * @returns {Promise<{ok: true, email: string} | {ok: false, reason: string}>}
 */
export async function verifyAccess(request, env) {
  // Local development: no Access in front of wrangler pages dev.
  if (env.ADMIN_DEV_BYPASS === 'true') {
    return { ok: true, email: 'dev@localhost' };
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return { ok: false, reason: 'Cloudflare Access is not configured for this deployment.' };
  }

  const jwt =
    request.headers.get('cf-access-jwt-assertion') ||
    (request.headers.get('cookie') || '').match(/CF_Authorization=([^;]+)/)?.[1];

  if (!jwt) return { ok: false, reason: 'No Access token present.' };

  const [headerB64, payloadB64, sigB64] = jwt.split('.');
  if (!headerB64 || !payloadB64 || !sigB64) return { ok: false, reason: 'Malformed token.' };

  let header, payload;
  try {
    header = b64urlToJson(headerB64);
    payload = b64urlToJson(payloadB64);
  } catch {
    return { ok: false, reason: 'Unreadable token.' };
  }

  const keys = await getKeys(env);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, reason: 'Unknown signing key.' };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!valid) return { ok: false, reason: 'Bad signature.' };

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { ok: false, reason: 'Token expired.' };
  if (payload.nbf && payload.nbf > now) return { ok: false, reason: 'Token not yet valid.' };

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return { ok: false, reason: 'Token audience mismatch.' };

  if (payload.iss && payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) {
    return { ok: false, reason: 'Token issuer mismatch.' };
  }

  return { ok: true, email: payload.email || 'unknown' };
}

/** Writes an audit row. Every moderator action goes through here. */
export async function logAction(env, { actor, entity, entityId, action, note }) {
  await env.DB.prepare(
    `INSERT INTO moderation_log (actor, entity, entity_id, action, note) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(actor, entity, entityId, action, note || null)
    .run();
}
