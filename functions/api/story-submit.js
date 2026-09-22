/**
 * POST /api/story-submit — accept a patient story into the moderation queue.
 *
 * Nothing here publishes. Every submission lands as status='pending' and a human has to
 * approve it. The auto-flagging below is a duty-of-care measure, not a filter: people
 * writing about the worst years of their life overshare, and a moderator should see the
 * risky bits highlighted rather than have to spot them.
 */
import { json, fail, methodGuard, str, isEmail, rateLimited, screenSubmission, clientIp } from '../../lib/http.js';
import { hashEmail, hashIp, hashUa, encrypt, token } from '../../lib/crypto.js';
import { sendStoryReceived } from '../../lib/email.js';
import { stripMetadata } from '../../lib/image.js';

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_LEN = 200;
const MAX_LEN = 5000;

/** Patterns a moderator should look at before anything goes public. */
const PII_CHECKS = [
  [/\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/, 'possible phone number'],
  [/\b\d{1,5}\s+[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct)\b/, 'possible street address'],
  [/\b\d{3}-\d{2}-\d{4}\b/, 'possible SSN'],
  [/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/, 'email address in body'],
  [/\b(?:Dr\.?|Doctor)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/, 'named clinician'],
  [/\b\d+\s?(?:mg|mcg|ml|iu)\b/i, 'dosage — may read as medical advice'],
];

function slugify(title, id) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `${base || 'story'}-${id}`;
}

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'POST');
  if (bad) return bad;

  const ip = clientIp(request);
  if (await rateLimited(env, `story:${ip}`, { limit: 3, windowSec: 3600 })) {
    return fail('Too many submissions from this connection. Try again in an hour.', 429);
  }

  const form = await request.formData();
  const body = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === 'string')
  );

  const screenError = await screenSubmission(env, request, body, { minSeconds: 10 });
  if (screenError) return fail(screenError, 400);

  // --- validate ------------------------------------------------------------
  const displayName = str(body.display_name, 60) || 'Anonymous';
  const state = str(body.state, 60) || null;
  const title = str(body.title, 120);
  const text = str(body.body, MAX_LEN);
  const email = str(body.email, 254).toLowerCase();
  const onsetYear = body.onset_year ? Number(body.onset_year) : null;

  if (!title) return fail('Please give your story a title.');
  if (text.length < MIN_LEN) return fail(`Your story needs at least ${MIN_LEN} characters.`);
  if (!isEmail(email)) return fail('That email address is not valid.');
  if (!body.consent_publish) return fail('We need your permission to publish before we can accept it.');
  if (onsetYear !== null && (onsetYear < 1950 || onsetYear > new Date().getFullYear())) {
    return fail('That onset year does not look right.');
  }

  const flags = PII_CHECKS.filter(([re]) => re.test(text)).map(([, label]) => label);

  // --- insert --------------------------------------------------------------
  const manageToken = token();
  const result = await env.DB.prepare(
    `INSERT INTO stories
       (slug, display_name, state, onset_year, title, body, email_hash, email_enc,
        consent_publish, consent_social, status, pii_flags, manage_token, ip_hash, ua_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', ?, ?, ?, ?)`
  )
    .bind(
      `pending-${manageToken.slice(0, 12)}`,      // real slug is assigned on approval
      displayName,
      state,
      onsetYear,
      title,
      text,
      await hashEmail(env, email),
      await encrypt(env, email),
      body.consent_social ? 1 : 0,
      flags.length ? JSON.stringify(flags) : null,
      manageToken,
      await hashIp(env, ip),
      await hashUa(env, request.headers.get('user-agent') || '')
    )
    .run();

  const storyId = result.meta.last_row_id;
  await env.DB.prepare(`UPDATE stories SET slug = ? WHERE id = ?`)
    .bind(slugify(title, storyId), storyId)
    .run();

  // --- optional photo ------------------------------------------------------
  const photo = form.get('photo');
  if (photo && typeof photo !== 'string' && photo.size > 0) {
    if (photo.size > MAX_BYTES) {
      return fail('That image is larger than the 5 MB limit.');
    }
    const cleaned = stripMetadata(await photo.arrayBuffer());
    if (!cleaned) {
      return fail('That file is not a JPEG, PNG or WebP image we can process.');
    }
    if (env.MEDIA) {
      const key = `stories/${storyId}/${token(8)}`;
      await env.MEDIA.put(key, cleaned.bytes, {
        httpMetadata: { contentType: cleaned.contentType },
      });
      await env.DB.prepare(
        `INSERT INTO story_media (story_id, r2_key, content_type, bytes) VALUES (?, ?, ?, ?)`
      )
        .bind(storyId, key, cleaned.contentType, cleaned.bytes.length)
        .run();
    }
  }

  // The story is safely in the queue at this point. A failed acknowledgement email is
  // not a reason to reject a submission somebody may have spent an hour writing.
  const site = env.SITE_URL || new URL(request.url).origin;
  try {
    await sendStoryReceived(env, {
      to: email,
      manageUrl: `${site}/api/me?t=${encodeURIComponent(manageToken)}`,
    });
  } catch (err) {
    console.error('[story-submit] acknowledgement email failed:', err.message);
  }

  return json({ ok: true, flagged: flags.length > 0 });
}
