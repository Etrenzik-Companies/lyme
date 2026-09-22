/** Site-wide behavior: nav, theme, counters, share links, live signature count. */
import { $, $$, api, fmt, wireCounters, shareUrl, copyText } from './util.js';

/* ------------------------------------------------------------------- nav */
const toggle = $('.nav-toggle');
const nav = $('#site-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}

/* ----------------------------------------------------------------- theme */
/* The only thing this site stores in the browser. Never leaves the device. */
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
} catch { /* private mode, blocked storage - the OS preference still applies */ }

/* --------------------------------------------------------------- counters */
wireCounters();

/* ------------------------------------------------ live signature counters */
const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000];

async function loadCount() {
  const targets = $$('[data-signature-count]');
  if (!targets.length) return;
  try {
    const { verified, states_represented } = await api('/api/count');
    targets.forEach((el) => { el.textContent = fmt(verified); });

    $$('[data-signature-states]').forEach((el) => {
      el.textContent = states_represented
        ? `from ${states_represented} states and territories`
        : '';
    });

    const goal = MILESTONES.find((m) => m > verified) || MILESTONES.at(-1);
    $$('[data-signature-goal]').forEach((el) => { el.textContent = fmt(goal); });
    $$('[data-signature-progress]').forEach((el) => {
      el.style.width = `${Math.min(100, (verified / goal) * 100).toFixed(1)}%`;
    });
  } catch {
    targets.forEach((el) => { el.textContent = '—'; });
  }
}
loadCount();

/* ----------------------------------------------------------- share links */
function wireShare(root = document) {
  $$('[data-share]', root).forEach((el) => {
    const card = el.closest('[data-share-scope], .post-card');
    const textEl = card && card.querySelector('[data-post-text]');
    const text = textEl ? textEl.textContent.trim() : document.title;
    const url = (card && card.dataset.shareUrl) || location.href;
    el.setAttribute('href', shareUrl(el.dataset.share, { url, text, subject: document.title }));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });

  $$('[data-copy]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.post-card');
      const textEl = card && card.querySelector('[data-post-text]');
      copyText(textEl ? textEl.textContent.trim() : location.href, btn);
    });
  });

  $$('[data-copy-link]', root).forEach((btn) => {
    btn.addEventListener('click', () => copyText(btn.dataset.link || location.href, btn));
  });
}
wireShare();

export { wireShare, loadCount };
