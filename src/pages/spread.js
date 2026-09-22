import { esc, SITE } from '../layout.js';

const POSTS = [
  {
    id: 'stat-short',
    label: 'Short — the undercount',
    text: `CDC counted 89,468 Lyme disease cases in 2023. CDC's own insurance data says the real number is closer to 476,000 a year. We are not being counted.`,
  },
  {
    id: 'stat-growth',
    label: 'Short — the trend',
    text: `Reported Lyme disease cases in the US are up more than 400% since 1996. There is still no human vaccine on the market and the diagnostic standard misses early infection.`,
  },
  {
    id: 'record',
    label: 'The congressional ask',
    text: `Between 1950 and 1975 the US Army ran declassified field trials using insects as biological weapon vectors. Congress has three times ordered a review of whether ticks were among them. The findings have never been published.`,
  },
  {
    id: 'petition',
    label: 'Recruiting signatures',
    text: `If Lyme disease took years of your life, put your name on the record. Verified signatures only — we are building a countable list of affected Americans, not a number we made up.`,
  },
  {
    id: 'long',
    label: 'Longer — for Facebook',
    text: `Most people think Lyme disease is a rash and two weeks of doxycycline.

CDC reported 89,468 cases in 2023. CDC's own analysis of insurance claims puts the real figure near 476,000 Americans diagnosed and treated every year — roughly ten times what the surveillance system captures.

Meanwhile: no human vaccine has been on the US market since 2002, the standard two-tier blood test misses a large share of early infections, and the complete federal record of Cold War research into ticks as disease vectors has never been released, despite Congress ordering a review three separate times.

If this disease has cost you something, there is now a place to say so on the record.`,
  },
];

export function spread() {
  const cards = POSTS.map(
    (p) => `
<article class="post-card" id="post-${esc(p.id)}">
  <header class="post-card-head">
    <h3>${esc(p.label)}</h3>
    <span class="post-len muted small">${p.text.length} chars</span>
  </header>
  <blockquote class="post-text" data-post-text>${esc(p.text)}</blockquote>
  <footer class="post-card-foot">
    <button class="btn btn-sm btn-ghost" type="button" data-copy>Copy text</button>
    <a class="btn btn-sm btn-ghost" data-share="x" href="#" rel="noopener">Post on X</a>
    <a class="btn btn-sm btn-ghost" data-share="facebook" href="#" rel="noopener">Share on Facebook</a>
  </footer>
</article>`
  ).join('');

  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Take action</p>
    <h1>Help us find the people this happened to</h1>
    <p class="lede measure">Most people with a Lyme disease story have never been asked for it.
    Every share reaches someone who assumed they were the only one.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>1. Post it</h2>
    <p class="muted measure">Copy any of these, or write your own. Each one links back to the
    tracker so the numbers travel with the message.</p>
    <div class="post-grid">${cards}</div>
  </div>
</section>

<section class="section section--alt">
  <div class="wrap">
    <h2>2. Email your representative</h2>
    <p class="muted measure">Enter your ZIP code to find your US House member and senators. This
    opens a prefilled message in your own email client — <strong>we never send anything on your
    behalf</strong>, and we do not see or store what you write.</p>

    <form class="form form--inline card" id="rep-form" novalidate>
      <label class="field field--narrow">
        <span class="field-label">ZIP code</span>
        <input name="zip" type="text" inputmode="numeric" pattern="[0-9]{5}" maxlength="5"
               placeholder="06371" required>
      </label>
      <button class="btn btn-primary" type="submit">Find my representatives</button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </form>

    <div class="rep-results" data-rep-results hidden></div>

    <details class="table-view">
      <summary>Read the draft message first</summary>
      <div class="prose">
        <pre class="draft-letter" data-draft-letter>Dear [Representative],

I am a constituent writing about Lyme disease.

CDC reported 89,468 cases in 2023, but CDC's own insurance-claims analysis estimates roughly 476,000 Americans are diagnosed and treated each year. The gap between those two numbers is the scale of what federal surveillance is missing.

I am asking you to support three things:

1. Public release of the complete Department of Defense and GAO findings on whether ticks and other arthropods were researched or used as biological weapon vectors between 1950 and 1975. The House has directed this review more than once and the findings remain unpublished.

2. Dedicated, independent funding for research into persistent illness following Lyme disease, including diagnostics and treatment.

3. Modernization of Lyme diagnostic standards, which by the agencies' own account miss a substantial share of early infections.

[Add your own story here — one or two sentences in your own words matters more than everything above.]

Thank you for your time.

[Your name]
[Your city, state ZIP]</pre>
      </div>
    </details>
  </div>
</section>

<section class="section">
  <div class="wrap grid-2">
    <div>
      <h2>3. Follow and amplify</h2>
      <p>The project posts a few times a day at most: new research, policy movement, signature
      milestones, and stories people have agreed to let us share.</p>
      <ul class="plain-list">
        <li><a href="#" data-social-link="x" rel="me noopener">Follow on X</a></li>
        <li><a href="#" data-social-link="facebook" rel="me noopener">Follow on Facebook</a></li>
        <li><a href="/feed.xml">Subscribe by RSS</a></li>
      </ul>
      <p class="muted small">Every post is written or approved by a person before it goes out.
      This project does not send unsolicited messages, does not scrape followers, and does not
      automate replies.</p>
    </div>
    <div>
      <h2>4. Send it to one person</h2>
      <p>Honestly, this is the one that works. Not a broadcast — one message to one person you
      know who has been sick for years without an answer.</p>
      <div class="share-row" data-share-page>
        <a class="btn btn-ghost btn-sm" data-share="x" href="#" rel="noopener">X</a>
        <a class="btn btn-ghost btn-sm" data-share="facebook" href="#" rel="noopener">Facebook</a>
        <a class="btn btn-ghost btn-sm" data-share="reddit" href="#" rel="noopener">Reddit</a>
        <a class="btn btn-ghost btn-sm" data-share="whatsapp" href="#" rel="noopener">WhatsApp</a>
        <a class="btn btn-ghost btn-sm" data-share="email" href="#">Email</a>
        <button class="btn btn-ghost btn-sm" type="button" data-copy-link data-link="${esc(SITE.url)}/">Copy link</button>
      </div>
    </div>
  </div>
</section>`;

  return {
    title: 'Take action',
    description:
      'Share the Lyme disease case data, email your representatives about declassifying federal ' +
      'tick research, and help find others affected.',
    path: '/spread/',
    ogImage: '/assets/og/growth.png',
    body,
    scripts: ['/assets/js/spread.js'],
  };
}
