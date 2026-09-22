/** Shared helpers. Every module here is loaded as an ES module with defer. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const fmt = (n) => Number(n).toLocaleString('en-US');

/** Escapes text destined for innerHTML. Everything user-submitted goes through this. */
export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** "2 hours ago" / "3 Mar 2026" for anything older than a week. */
export function relTime(iso) {
  if (!iso) return '';
  const then = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(then.getTime())) return '';
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 8) return `${days} day${days === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Live character counters for any textarea/input with a [data-count-for] partner. */
export function wireCounters(root = document) {
  $$('[data-count-for]', root).forEach((out) => {
    const field = $(`[name="${out.dataset.countFor}"]`, root);
    if (!field) return;
    const max = Number(field.getAttribute('maxlength')) || 0;
    const update = () => { out.textContent = fmt(Math.max(0, max - field.value.length)); };
    field.addEventListener('input', update);
    update();
  });
}

/**
 * Minimum time-on-form check. Bots submit instantly; people do not.
 * Paired with the server-side check on the same field.
 */
export function stampStartTime(form) {
  const field = form.querySelector('input[name="started_at"]');
  if (field) field.value = String(Date.now());
}

export function setStatus(form, message, kind = '') {
  const el = form.querySelector('.form-status');
  if (!el) return;
  el.textContent = message;
  el.className = `form-status${kind ? ` is-${kind}` : ''}`;
}

/** Turnstile renders itself; this just reads the token it dropped into the form. */
export function turnstileToken(form) {
  const input = form.querySelector('input[name="cf-turnstile-response"]');
  return input ? input.value : '';
}

export const SHARE_TEXT_LIMIT = 260;

export function shareUrl(platform, { url, text = '', subject = '' }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  switch (platform) {
    case 'x':        return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'reddit':   return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case 'whatsapp': return `https://api.whatsapp.com/send?text=${t}%20${u}`;
    case 'email':    return `mailto:?subject=${encodeURIComponent(subject || text)}&body=${t}%0A%0A${u}`;
    default:         return url;
  }
}

/** Copy-to-clipboard with a graceful fallback and visible confirmation. */
export async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
  }
  if (button) {
    const original = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = original; }, 1600);
  }
}
