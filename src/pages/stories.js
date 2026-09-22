import { esc, disclaimerBox } from '../layout.js';
import { STATES } from './petition.js';

export function stories() {
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">In their own words</p>
    <h1>What this disease actually costs</h1>
    <p class="lede measure">Case counts are an argument. These are the people inside the numbers —
    published with their permission, after review by a human being.</p>
    <p><a class="btn btn-primary" href="/stories/share/">Share your story</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${disclaimerBox('medical')}

    <div class="filters">
      <label class="field field--inline">
        <span class="sr-only">Filter by state</span>
        <select id="story-state">
          <option value="">All states</option>
          ${STATES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
        </select>
      </label>
      <label class="field field--inline">
        <span class="sr-only">Search stories</span>
        <input type="search" id="story-search" placeholder="Search stories&hellip;" autocomplete="off">
      </label>
    </div>

    <div class="story-grid" data-story-list>
      <p class="news-loading">Loading stories&hellip;</p>
    </div>

    <div class="center">
      <button class="btn btn-ghost" type="button" data-story-more hidden>Load more</button>
    </div>
  </div>
</section>`;

  return {
    title: 'Patient stories',
    description:
      'First-hand accounts from Americans living with Lyme disease and its aftermath, published ' +
      'with consent after human moderation.',
    path: '/stories/',
    ogImage: '/assets/og/stories.png',
    body,
    scripts: ['/assets/js/stories.js'],
  };
}

export function storyShare(siteKey) {
  const thisYear = new Date().getFullYear();
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Share your story</p>
    <h1>Tell us what happened to you</h1>
    <p class="lede measure">Nothing here publishes automatically. A person reads every submission
    before it appears, and you can ask us to take yours down at any time.</p>
  </div>
</section>

<section class="section">
  <div class="wrap grid-story">
    <form class="form card" id="story-form" method="post" action="/api/story-submit" novalidate
          enctype="multipart/form-data">
      <h2 class="card-head">Your story</h2>

      <label class="field">
        <span class="field-label">How should we credit you? <em>required</em></span>
        <input name="display_name" type="text" required maxlength="60" placeholder="Sarah M., or Anonymous">
        <span class="field-help">Type <strong>Anonymous</strong> if you would rather not be named.
        Please do not enter your full legal name.</span>
      </label>

      <div class="form-row">
        <label class="field">
          <span class="field-label">State <span class="opt">optional</span></span>
          <select name="state">
            <option value="">Prefer not to say</option>
            ${STATES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          </select>
        </label>
        <label class="field field--narrow">
          <span class="field-label">Year it started <span class="opt">optional</span></span>
          <input name="onset_year" type="number" min="1950" max="${thisYear}" inputmode="numeric">
        </label>
      </div>

      <label class="field">
        <span class="field-label">Title <em>required</em></span>
        <input name="title" type="text" required maxlength="120"
               placeholder="Eleven doctors before anyone tested me">
      </label>

      <label class="field">
        <span class="field-label">Your story <em>required</em></span>
        <textarea name="body" rows="14" required minlength="200" maxlength="5000"
                  placeholder="What happened, how long it took to get answers, and what it has cost you."></textarea>
        <span class="field-help"><span data-count-for="body">5000</span> characters left · 200 minimum</span>
      </label>

      <label class="field">
        <span class="field-label">Photo <span class="opt">optional</span></span>
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp">
        <span class="field-help">Up to 5&nbsp;MB. Location data is stripped before storage.</span>
      </label>

      <label class="field">
        <span class="field-label">Your email <em>required</em></span>
        <input name="email" type="email" required maxlength="254" autocomplete="email" inputmode="email">
        <span class="field-help">Used only to reach you about your submission. Never published,
        never sold.</span>
      </label>

      <fieldset class="consents">
        <legend>Permissions</legend>
        <label class="check">
          <input type="checkbox" name="consent_publish" value="1" required>
          <span>I want my story published on this site, under the name I entered above.
          <em>Required</em></span>
        </label>
        <label class="check">
          <input type="checkbox" name="consent_social" value="1">
          <span>You may also quote my story on the project's social accounts.</span>
        </label>
      </fieldset>

      <div class="hp" aria-hidden="true">
        <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <input type="hidden" name="started_at" value="">

      <div class="cf-turnstile" data-sitekey="${esc(siteKey)}" data-theme="auto"></div>

      <button class="btn btn-primary btn-block" type="submit">Submit for review</button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </form>

    <aside class="story-aside">
      <div class="callout callout--care">
        <h2 class="callout-head">Before you write</h2>
        <ul>
          <li><strong>Leave out other people's names.</strong> Doctors, employers, family members —
          describe them by role, not by name. We will flag it if you forget, but it is easier if you
          never type it.</li>
          <li><strong>No addresses or phone numbers</strong>, yours or anyone else's.</li>
          <li><strong>Skip treatment protocols.</strong> We can't publish specific drug, dose or
          supplement regimens — this site is not a source of medical advice and cannot become one.</li>
          <li>Write it the way you'd tell a friend. We do not edit for style.</li>
        </ul>
      </div>

      <div class="callout callout--crisis">
        <p>Writing about this can be hard. If you are struggling, call or text
        <a href="tel:988">988</a> — the US Suicide &amp; Crisis Lifeline, free and confidential,
        any hour.</p>
      </div>

      ${disclaimerBox('medical')}
    </aside>
  </div>
</section>`;

  return {
    title: 'Share your story',
    description:
      'Submit your first-hand account of living with Lyme disease. Reviewed by a human before ' +
      'publication, published only with your consent.',
    path: '/stories/share/',
    ogImage: '/assets/og/stories.png',
    body,
    scripts: ['/assets/js/story-form.js'],
  };
}
