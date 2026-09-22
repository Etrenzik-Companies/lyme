/**
 * The "email your representative" tool.
 *
 * Design note: members of Congress do not publish working email addresses — they use
 * per-office web contact forms. So this does NOT fake a mailto to a fabricated address.
 * It resolves the ZIP to a state, links to the official House ZIP lookup and the official
 * Senate contact page for that state, and hands over the draft to paste in.
 *
 * Nothing is ever sent on the visitor's behalf, and the letter text never leaves the browser.
 */
import { $, $$, esc, copyText, setStatus } from './util.js';

/* ZIP prefix -> USPS state. First three digits are enough to place every ZIP. */
const ZIP_RANGES = [
  [[995, 999], 'AK'], [[350, 352], 'AL'], [[354, 369], 'AL'], [[716, 729], 'AR'],
  [[850, 865], 'AZ'], [[900, 961], 'CA'], [[800, 816], 'CO'], [[60, 69], 'CT'],
  [[200, 205], 'DC'], [[197, 199], 'DE'], [[320, 349], 'FL'], [[300, 319], 'GA'],
  [[398, 399], 'GA'], [[967, 968], 'HI'], [[500, 528], 'IA'], [[832, 838], 'ID'],
  [[600, 629], 'IL'], [[460, 479], 'IN'], [[660, 679], 'KS'], [[400, 427], 'KY'],
  [[700, 714], 'LA'], [[10, 27], 'MA'], [[206, 219], 'MD'], [[39, 49], 'ME'],
  [[480, 499], 'MI'], [[550, 567], 'MN'], [[630, 658], 'MO'], [[386, 397], 'MS'],
  [[590, 599], 'MT'], [[270, 289], 'NC'], [[580, 588], 'ND'], [[680, 693], 'NE'],
  [[30, 38], 'NH'], [[70, 89], 'NJ'], [[870, 884], 'NM'], [[889, 898], 'NV'],
  [[100, 149], 'NY'], [[63, 63], 'NY'], [[430, 459], 'OH'], [[730, 749], 'OK'],
  [[970, 979], 'OR'], [[150, 196], 'PA'], [[6, 9], 'PR'], [[28, 29], 'RI'],
  [[290, 299], 'SC'], [[570, 577], 'SD'], [[370, 385], 'TN'], [[750, 799], 'TX'],
  [[885, 885], 'TX'], [[840, 847], 'UT'], [[220, 246], 'VA'], [[50, 59], 'VT'],
  [[980, 994], 'WA'], [[530, 549], 'WI'], [[247, 268], 'WV'], [[820, 831], 'WY'],
];

const STATE_NAMES = {
  AK: 'Alaska', AL: 'Alabama', AR: 'Arkansas', AZ: 'Arizona', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DC: 'District of Columbia', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', IA: 'Iowa', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', MA: 'Massachusetts',
  MD: 'Maryland', ME: 'Maine', MI: 'Michigan', MN: 'Minnesota', MO: 'Missouri',
  MS: 'Mississippi', MT: 'Montana', NC: 'North Carolina', ND: 'North Dakota',
  NE: 'Nebraska', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NV: 'Nevada',
  NY: 'New York', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VA: 'Virginia', VT: 'Vermont',
  WA: 'Washington', WI: 'Wisconsin', WV: 'West Virginia', WY: 'Wyoming',
};

function stateForZip(zip) {
  const prefix = Number(zip.slice(0, 3));
  for (const [[lo, hi], st] of ZIP_RANGES) {
    if (prefix >= lo && prefix <= hi) return st;
  }
  return null;
}

const form = $('#rep-form');
const results = $('[data-rep-results]');

if (form && results) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const zip = String(new FormData(form).get('zip') || '').trim();

    if (!/^\d{5}$/.test(zip)) {
      setStatus(form, 'Enter a five-digit ZIP code.', 'error');
      return;
    }

    const st = stateForZip(zip);
    if (!st) {
      setStatus(form, "We couldn't place that ZIP code. Use the official lookup below.", 'error');
      return;
    }

    setStatus(form, '');
    results.hidden = false;
    results.innerHTML = `
<div class="rep-card">
  <h3>Your US Representative</h3>
  <p class="muted small">One House member covers your district. The official lookup takes your
  full ZIP and opens their contact form.</p>
  <p><a class="btn btn-sm btn-primary" href="https://ziplook.house.gov/htbin/findrep?ZIP=${esc(zip)}"
        target="_blank" rel="noopener">Find my representative &rarr;</a></p>
</div>
<div class="rep-card">
  <h3>Your two US Senators</h3>
  <p class="muted small">Both senators represent all of ${esc(STATE_NAMES[st] || st)}. Contact
  both — offices tally messages separately.</p>
  <p><a class="btn btn-sm btn-primary"
        href="https://www.senate.gov/states/${esc(st)}/intro.htm"
        target="_blank" rel="noopener">${esc(STATE_NAMES[st] || st)} senators &rarr;</a></p>
</div>
<div class="rep-card">
  <h3>The message</h3>
  <p class="muted small">Congressional offices use web forms, not email, so copy this and paste it
  in. Add a sentence in your own words — staff count personal messages differently from form letters.</p>
  <p><button class="btn btn-sm btn-ghost" type="button" data-copy-letter>Copy the draft letter</button></p>
</div>`;

    $$('[data-copy-letter]', results).forEach((btn) => {
      btn.addEventListener('click', () => {
        const letter = $('[data-draft-letter]');
        copyText(letter ? letter.textContent : '', btn);
      });
    });

    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* Social profile links are filled in from config once the accounts exist. */
const HANDLES = {
  x: '',          // e.g. 'https://x.com/lymeaccount'
  facebook: '',   // e.g. 'https://facebook.com/lymeaccount'
};
$$('[data-social-link]').forEach((a) => {
  const href = HANDLES[a.dataset.socialLink];
  if (href) {
    a.href = href;
    a.target = '_blank';
  } else {
    a.removeAttribute('href');
    a.classList.add('muted');
    a.textContent += ' (coming soon)';
  }
});
