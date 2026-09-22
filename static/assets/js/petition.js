/** Petition form submission and the public signature wall. */
import { $, api, esc, stampStartTime, setStatus, turnstileToken } from './util.js';

/* ------------------------------------------------------------ the form */

const form = $('#sign-form');
if (form) {
  stampStartTime(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);

    // Client-side validation is a courtesy; the server re-checks all of it.
    const email = String(fd.get('email') || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      setStatus(form, 'That email address does not look right.', 'error');
      form.querySelector('[name="email"]').setAttribute('aria-invalid', 'true');
      return;
    }
    form.querySelector('[name="email"]').removeAttribute('aria-invalid');

    if (!turnstileToken(form)) {
      setStatus(form, 'Please complete the verification box above, then try again.', 'error');
      return;
    }

    btn.disabled = true;
    setStatus(form, 'Submitting…');

    try {
      const payload = Object.fromEntries(fd.entries());
      payload.consent_public = fd.get('consent_public') ? 1 : 0;
      payload.consent_contact = fd.get('consent_contact') ? 1 : 0;

      await api('/api/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      window.location.href = '/petition/check-email/';
    } catch (err) {
      setStatus(form, err.message || 'Something went wrong. Please try again.', 'error');
      btn.disabled = false;
      if (window.turnstile) window.turnstile.reset();
    }
  });
}

/* --------------------------------------------------------- the wall */

const wall = $('[data-signature-wall]');
if (wall) {
  const moreBtn = $('[data-wall-more]');
  let offset = 0;
  const PAGE = 36;

  function card(s) {
    return `
<div class="wall-item">
  <div class="wall-name">${esc(s.name)}</div>
  <div class="wall-meta">${esc(s.state)}${s.relationship ? ` &middot; ${esc(s.relationship)}` : ''}</div>
  ${s.statement ? `<p class="wall-statement">&ldquo;${esc(s.statement)}&rdquo;</p>` : ''}
</div>`;
  }

  async function load() {
    try {
      const { signatures } = await api(`/api/wall?limit=${PAGE}&offset=${offset}`);
      if (offset === 0) wall.innerHTML = '';
      if (!signatures.length && offset === 0) {
        wall.innerHTML =
          '<p class="empty-state">No public signatures yet. Signers choose whether to appear here &mdash; everyone else is counted but not named.</p>';
      } else {
        wall.insertAdjacentHTML('beforeend', signatures.map(card).join(''));
      }
      offset += signatures.length;
      if (moreBtn) moreBtn.hidden = signatures.length < PAGE;
    } catch {
      if (offset === 0) wall.innerHTML = '<p class="empty-state">Could not load the wall right now.</p>';
      if (moreBtn) moreBtn.hidden = true;
    }
  }

  if (moreBtn) moreBtn.addEventListener('click', load);
  load();
}
