/**
 * Transactional email.
 *
 * Only three messages are ever sent, all of them in direct response to something the
 * person just did: confirm your signature, we got your story, your story is published.
 * There is no newsletter blast here and no list rental. If a marketing send is ever
 * added it needs its own opt-in and its own unsubscribe.
 *
 * Delivery goes through MailChannels, which Workers can use without an API key once the
 * sending domain has the right DNS records (see SOCIAL-SETUP.md / README).
 */
import { SITE_NAME_FALLBACK } from './constants.js';

const ENDPOINT = 'https://api.mailchannels.net/tx/v1/send';

function shell(title, bodyHtml, footerNote) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#12171c;line-height:1.6">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #dcdedb;border-radius:10px;padding:28px">
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3">${title}</h1>
${bodyHtml}
<hr style="border:0;border-top:1px solid #dcdedb;margin:26px 0 16px">
<p style="margin:0;font-size:12px;color:#6d7883">${footerNote}</p>
</div></body></html>`;
}

async function send(env, { to, subject, html, text }) {
  const from = env.MAIL_FROM || 'noreply@lyme.etrenzik.com';
  const name = env.SITE_NAME || SITE_NAME_FALLBACK;

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html },
    ],
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Never surface the recipient address in logs.
    console.error(`[email] ${subject} failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

export async function sendVerification(env, { to, firstName, verifyUrl, manageUrl }) {
  const subject = 'Confirm your signature';
  const html = shell(
    'One click and you are counted',
    `<p style="margin:0 0 16px">${firstName ? `${firstName}, t` : 'T'}hanks for signing. Your
     signature is <strong>not counted yet</strong> — we only report signatures that have been
     confirmed, which is what makes the number worth anything.</p>
     <p style="margin:0 0 24px"><a href="${verifyUrl}"
       style="display:inline-block;background:#1f6f43;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">Confirm my signature</a></p>
     <p style="margin:0 0 8px;font-size:13px;color:#4b5560">Or paste this into your browser:<br>
     <span style="word-break:break-all">${verifyUrl}</span></p>`,
    `Keep this email: <a href="${manageUrl}">this link</a> lets you export or delete everything we
     hold about you, at any time. If you did not sign, ignore this message and nothing is recorded.`
  );
  const text = `Confirm your signature: ${verifyUrl}\n\nYour signature is not counted until you click.\n\nExport or delete your data any time: ${manageUrl}\n\nIf you did not sign this petition, ignore this email.`;
  return send(env, { to, subject, html, text });
}

export async function sendStoryReceived(env, { to, manageUrl }) {
  const subject = 'We have your story';
  const html = shell(
    'Your story is in the queue',
    `<p style="margin:0 0 16px">A person reads every submission before anything is published —
     usually within a few days. We will email you either way, including if we need to ask you to
     change something.</p>
     <p style="margin:0">You can withdraw your story at any time, before or after publication, by
     replying to this email.</p>`,
    `<a href="${manageUrl}">Manage or delete your submission</a>.`
  );
  const text = `We received your story. A moderator reviews every submission before publication and we will email you either way.\n\nManage or delete it: ${manageUrl}`;
  return send(env, { to, subject, html, text });
}

export async function sendStoryPublished(env, { to, storyUrl, manageUrl }) {
  const subject = 'Your story is published';
  const html = shell(
    'Your story is live',
    `<p style="margin:0 0 20px">Thank you for writing it. It is now on the site.</p>
     <p style="margin:0 0 24px"><a href="${storyUrl}"
       style="display:inline-block;background:#1f6f43;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">Read it on the site</a></p>`,
    `Want it taken down? <a href="${manageUrl}">Use this link</a> or just reply to this email.`
  );
  const text = `Your story is published: ${storyUrl}\n\nTo remove it: ${manageUrl}`;
  return send(env, { to, subject, html, text });
}
