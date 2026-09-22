/**
 * POST /api/sign — add a petition signature.
 *
 * The signature is written with verified = 0 and does NOT count toward any public number
 * until the emailed link is clicked. That double opt-in is the whole credibility model:
 * a petition whose count can be inflated by a script is worth nothing to a congressional
 * office and worse than nothing to a law firm.
 */
import { json, fail, methodGuard, readBody, str, isEmail, rateLimited, screenSubmission, clientIp, requireDb } from '../../lib/http.js';
import { hashEmail, hashIp, hashUa, encrypt, token } from '../../lib/crypto.js';
import { sendVerification } from '../../lib/email.js';
import { RELATIONSHIPS } from '../../lib/constants.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'POST');
  if (bad) return bad;

  const noDb = requireDb(env, { readOnly: false });
  if (noDb) return noDb;

  const ip = clientIp(request);
  if (await rateLimited(env, `sign:${ip}`, { limit: 5, windowSec: 3600 })) {
    return fail('Too many submissions from this connection. Try again in an hour.', 429);
  }

  const body = await readBody(request);

  const screenError = await screenSubmission(env, request, body);
  if (screenError) return fail(screenError, 400);

  // --- validate ------------------------------------------------------------
  const firstName = str(body.first_name, 60);
  const lastInitial = str(body.last_initial, 1).toUpperCase();
  const state = str(body.state, 60);
  const email = str(body.email, 254).toLowerCase();
  const relationship = str(body.relationship, 20);
  const statement = str(body.statement, 280);
  const years = body.years_affected === '' || body.years_affected == null
    ? null
    : Math.max(0, Math.min(80, Number(body.years_affected) || 0));

  if (!firstName) return fail('First name is required.');
  if (!/^[A-Z]$/.test(lastInitial)) return fail('Last initial must be a single letter.');
  if (!state) return fail('Please choose your state.');
  if (!isEmail(email)) return fail('That email address is not valid.');
  if (!RELATIONSHIPS[relationship]) return fail('Please choose your connection to this issue.');

  const consentPublic = body.consent_public ? 1 : 0;
  const consentContact = body.consent_contact ? 1 : 0;

  // --- store ---------------------------------------------------------------
  const emailHash = await hashEmail(env, email);
  const emailEnc = await encrypt(env, email);
  const verifyToken = token();
  const manageToken = token();

  const existing = await env.DB.prepare(
    `SELECT id, verified FROM signatures WHERE email_hash = ?`
  ).bind(emailHash).first();

  if (existing) {
    if (existing.verified) {
      // Do not reveal that this address is already on the list — that would turn the
      // endpoint into a membership oracle. Respond exactly as we do for a new signer.
      return json({ ok: true });
    }
    // Unverified duplicate: refresh the token and resend, so a lost email is recoverable.
    await env.DB.prepare(
      `UPDATE signatures SET verify_token = ?, created_at = datetime('now') WHERE id = ?`
    ).bind(verifyToken, existing.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO signatures
         (first_name, last_initial, state, email_hash, email_enc, relationship, years_affected,
          statement, consent_public, consent_contact, verify_token, manage_token, ip_hash, ua_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        firstName,
        lastInitial,
        state,
        emailHash,
        emailEnc,
        relationship,
        years,
        statement || null,
        consentPublic,
        consentContact,
        verifyToken,
        manageToken,
        await hashIp(env, ip),
        await hashUa(env, request.headers.get('user-agent') || '')
      )
      .run();
  }

  // --- confirm -------------------------------------------------------------
  // The row is already committed. If the mail provider is down we still keep the
  // signature and tell the person to retry rather than losing what they typed — an
  // unverified row expires on its own after 30 days if the link never arrives.
  const site = env.SITE_URL || new URL(request.url).origin;
  let mailed = false;
  try {
    mailed = await sendVerification(env, {
      to: email,
      firstName,
      verifyUrl: `${site}/api/verify?t=${encodeURIComponent(verifyToken)}`,
      manageUrl: `${site}/api/me?t=${encodeURIComponent(manageToken)}`,
    });
  } catch (err) {
    console.error('[sign] verification email failed:', err.message);
  }

  return json({ ok: true, mailed });
}
