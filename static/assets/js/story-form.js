/**
 * Story submission.
 *
 * Sends multipart/form-data because of the optional photo. The client also warns about
 * obvious oversharing before submitting - the server flags it again for the moderator,
 * but catching it here means the person can fix it rather than having it sit in a queue.
 */
import { $, setStatus, stampStartTime, turnstileToken } from './util.js';

const MAX_BYTES = 5 * 1024 * 1024;

const PII_PATTERNS = [
  [/\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/, 'what looks like a phone number'],
  [/\b\d{1,5}\s+[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct)\b/, 'what looks like a street address'],
  [/\b\d{3}-\d{2}-\d{4}\b/, 'what looks like a Social Security number'],
  [/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/, 'an email address inside the story text'],
];

const form = $('#story-form');
if (form) {
  stampStartTime(form);

  const bodyField = form.querySelector('[name="body"]');
  const photo = form.querySelector('[name="photo"]');
  let overrode = false;

  if (photo) {
    photo.addEventListener('change', () => {
      const file = photo.files && photo.files[0];
      if (file && file.size > MAX_BYTES) {
        setStatus(form, `That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 5 MB.`, 'error');
        photo.value = '';
      } else {
        setStatus(form, '');
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const text = bodyField.value.trim();

    if (text.length < 200) {
      setStatus(form, `Your story is ${text.length} characters. We need at least 200.`, 'error');
      bodyField.setAttribute('aria-invalid', 'true');
      bodyField.focus();
      return;
    }
    bodyField.removeAttribute('aria-invalid');

    if (!form.querySelector('[name="consent_publish"]').checked) {
      setStatus(form, 'We need your permission to publish before we can accept the story.', 'error');
      return;
    }

    if (!turnstileToken(form)) {
      setStatus(form, 'Please complete the verification box above, then try again.', 'error');
      return;
    }

    // One soft warning, not a block. It is their story and their call.
    if (!overrode) {
      const hits = PII_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
      if (hits.length) {
        overrode = true;
        setStatus(
          form,
          `Heads up: your story contains ${hits.join(' and ')}. We would rather you took it out ` +
            `— this page is public. Edit it, or press Submit again to send it as written.`,
          'error'
        );
        return;
      }
    }

    btn.disabled = true;
    setStatus(form, 'Sending…');

    try {
      const fd = new FormData(form);
      const res = await fetch('/api/story-submit', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || `Submission failed (${res.status})`);
      window.location.href = '/stories/thanks/';
    } catch (err) {
      setStatus(form, err.message || 'Something went wrong. Please try again.', 'error');
      btn.disabled = false;
      if (window.turnstile) window.turnstile.reset();
    }
  });
}
