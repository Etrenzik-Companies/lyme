/* ===========================================================================
   SOCIAL POSTING — HARD LIMITS. READ BEFORE CHANGING ANYTHING IN THIS FILE.

   This module may ONLY:
     - post to social accounts THIS PROJECT OWNS,
     - through the platforms' official APIs,
     - on a schedule,
     - with a human having approved each individual post.

   This module must NEVER be extended to:
     - send direct messages, solicited or otherwise,
     - auto-follow, auto-unfollow, or scrape follower lists,
     - auto-reply to, quote, or mention accounts that did not opt in,
     - post the same content across many accounts to simulate reach,
     - contact anybody who has not asked to hear from this project.

   Those things get accounts permanently banned, and more importantly they would make
   a project about sick people asking to be heard look like a bot farm. The petition's
   only real asset is that its numbers and its outreach are honest. Do not trade that
   for reach.
   =========================================================================== */

const X_TWEET_LIMIT = 280;
const FB_POST_LIMIT = 63206;

export const limitFor = (platform) => (platform === 'x' ? X_TWEET_LIMIT : FB_POST_LIMIT);

/** True when a draft is short enough to post as-is. */
export const fits = (platform, body, link) => {
  // X counts every URL as 23 characters regardless of real length.
  const linkCost = link ? 24 : 0;
  return body.length + linkCost <= limitFor(platform);
};

/* ------------------------------------------------------------------ X API */

/**
 * X uses OAuth 2.0 with a refresh token. Access tokens last two hours, so we exchange
 * the refresh token on every run and persist the rotated one back into KV — X issues a
 * new refresh token each time and invalidates the old one.
 */
async function xAccessToken(env) {
  if (!env.X_CLIENT_ID || !env.X_REFRESH_TOKEN_KV_KEY) {
    throw new Error('X credentials are not configured');
  }

  const stored = (await env.KV.get(env.X_REFRESH_TOKEN_KV_KEY)) || env.X_REFRESH_TOKEN;
  if (!stored) throw new Error('No X refresh token available');

  const basic = btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`);
  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored,
      client_id: env.X_CLIENT_ID,
    }),
  });

  if (!res.ok) throw new Error(`X token refresh failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  if (data.refresh_token) {
    await env.KV.put(env.X_REFRESH_TOKEN_KV_KEY, data.refresh_token);
  }
  return data.access_token;
}

async function postToX(env, { body, link }) {
  const token = await xAccessToken(env);
  const text = link ? `${body}\n\n${link}` : body;

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (res.status === 429) {
    const reset = res.headers.get('x-rate-limit-reset');
    const err = new Error('X rate limit reached');
    err.retryAfter = reset ? Number(reset) * 1000 - Date.now() : 15 * 60 * 1000;
    err.retryable = true;
    throw err;
  }
  if (!res.ok) throw new Error(`X post failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return data?.data?.id || null;
}

/* ----------------------------------------------------------- Facebook API */

async function postToFacebook(env, { body, link }) {
  if (!env.FB_PAGE_ID || !env.FB_PAGE_TOKEN) {
    throw new Error('Facebook credentials are not configured');
  }

  const params = new URLSearchParams({ message: body, access_token: env.FB_PAGE_TOKEN });
  if (link) params.set('link', link);

  const res = await fetch(`https://graph.facebook.com/v21.0/${env.FB_PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Facebook post failed: ${res.status} ${text}`);
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }

  const data = await res.json();
  return data.id || null;
}

/* ------------------------------------------------------------ dispatcher */

/**
 * Posts one approved draft. Returns the platform's post id.
 * Throws with `.retryable = true` when the caller should re-queue rather than fail.
 */
export async function publish(env, draft) {
  if (draft.status !== 'approved') {
    throw new Error('refusing to publish a draft that has not been approved by a human');
  }
  if (draft.platform === 'x') return postToX(env, draft);
  if (draft.platform === 'facebook') return postToFacebook(env, draft);
  throw new Error(`unknown platform: ${draft.platform}`);
}

/** Truncates on a word boundary so a draft never gets cut mid-word. */
export function trim(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
