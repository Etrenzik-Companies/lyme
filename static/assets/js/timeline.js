/** Evidence-tier filtering on the record page. */
import { $$ } from './util.js';

const buttons = $$('[data-tier]');
const items = $$('.tl-item');

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tier = btn.dataset.tier;

    buttons.forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    let shown = 0;
    items.forEach((li) => {
      const match = tier === 'all' || li.classList.contains(`tl-item--${tier}`);
      li.hidden = !match;
      if (match) shown++;
    });

    // Announce the result rather than leaving a screen-reader user guessing.
    const live = document.getElementById('tl-live') || (() => {
      const el = document.createElement('p');
      el.id = 'tl-live';
      el.className = 'sr-only';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      buttons[0].parentElement.after(el);
      return el;
    })();
    live.textContent = `${shown} timeline ${shown === 1 ? 'entry' : 'entries'} shown.`;
  });
});
