import { esc, disclaimerBox } from '../layout.js';
import { DEMANDS } from '../content/timeline.js';

const STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas',
  'Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York',
  'North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Puerto Rico',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia',
  'Washington','West Virginia','Wisconsin','Wyoming','Outside the United States',
];

const RELATIONSHIPS = [
  ['patient', 'I have or had Lyme disease'],
  ['caregiver', 'I care for someone with Lyme disease'],
  ['bereaved', 'I lost someone'],
  ['clinician', 'I treat patients with Lyme disease'],
  ['supporter', 'I support this effort'],
];

export function petition(siteKey) {
  const demands = DEMANDS.map(
    (d, i) => `
<li class="demand demand--numbered">
  <span class="demand-num" aria-hidden="true">${i + 1}</span>
  <div>
    <h3>${esc(d.title)}</h3>
    <p>${esc(d.body)}</p>
  </div>
</li>`
  ).join('');

  const stateOpts = STATES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  const relOpts = RELATIONSHIPS.map(
    ([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`
  ).join('');

  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Petition</p>
    <h1>Publish the record. Fund the science. Stop leaving us to prove we're sick.</h1>
    <p class="lede measure">A signature here is a verified, countable American saying this happened
    to them. That is what moves a congressional office, and it is what a law firm asks for first.</p>
    <div class="counter-block">
      <div class="counter-value" data-signature-count aria-live="polite">&mdash;</div>
      <div class="counter-label">verified signatures
        <span class="counter-sub" data-signature-states></span>
      </div>
      <div class="counter-bar"><div class="counter-fill" data-signature-progress></div></div>
      <p class="counter-goal muted small">Next milestone: <span data-signature-goal>1,000</span></p>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap grid-petition">
    <div class="petition-demands">
      <h2>What you are signing</h2>
      <ol class="demands">${demands}</ol>
      <p class="muted small">The full sourced basis for these demands is on the
      <a href="/history/">record page</a>. Read it before you sign — we would rather have a
      smaller list of people who know exactly what they put their name to.</p>
    </div>

    <div class="petition-form-col">
      <form class="form card" id="sign-form" method="post" action="/api/sign" novalidate>
        <h2 class="card-head">Add your name</h2>

        <div class="form-row">
          <label class="field">
            <span class="field-label">First name <em>required</em></span>
            <input name="first_name" type="text" required maxlength="60" autocomplete="given-name">
          </label>
          <label class="field field--narrow">
            <span class="field-label">Last initial <em>required</em></span>
            <input name="last_initial" type="text" required maxlength="1" pattern="[A-Za-z]"
                   autocomplete="family-name" placeholder="M">
          </label>
        </div>

        <label class="field">
          <span class="field-label">State <em>required</em></span>
          <select name="state" required autocomplete="address-level1">
            <option value="">Choose&hellip;</option>${stateOpts}
          </select>
        </label>

        <label class="field">
          <span class="field-label">Email <em>required</em></span>
          <input name="email" type="email" required maxlength="254" autocomplete="email"
                 inputmode="email" aria-describedby="email-help">
          <span class="field-help" id="email-help">We send one confirmation link. Your signature is
          not counted until you click it. We never sell, share or publish your email.</span>
        </label>

        <label class="field">
          <span class="field-label">Your connection to this <em>required</em></span>
          <select name="relationship" required>
            <option value="">Choose&hellip;</option>${relOpts}
          </select>
        </label>

        <label class="field">
          <span class="field-label">Years affected <span class="opt">optional</span></span>
          <input name="years_affected" type="number" min="0" max="80" inputmode="numeric">
        </label>

        <label class="field">
          <span class="field-label">Your statement <span class="opt">optional</span></span>
          <textarea name="statement" rows="4" maxlength="280"
                    placeholder="One or two sentences. Shown publicly only if you choose below."></textarea>
          <span class="field-help"><span data-count-for="statement">280</span> characters left</span>
        </label>

        <fieldset class="consents">
          <legend>Your choices</legend>
          <label class="check">
            <input type="checkbox" name="consent_public" value="1">
            <span>Show my first name, last initial and state on the public signature wall.</span>
          </label>
          <label class="check">
            <input type="checkbox" name="consent_contact" value="1">
            <span>Contact me if legal counsel is engaged, or if there is a hearing I could testify at.</span>
          </label>
        </fieldset>

        <!-- Honeypot. Real people never fill this in; it is hidden from assistive tech too. -->
        <div class="hp" aria-hidden="true">
          <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        </div>
        <input type="hidden" name="started_at" value="">

        <div class="cf-turnstile" data-sitekey="${esc(siteKey)}" data-theme="auto"></div>

        <button class="btn btn-primary btn-block" type="submit">Sign the petition</button>
        <p class="form-status" role="status" aria-live="polite"></p>
        <p class="muted small">By signing you agree to the <a href="/legal/terms/">terms</a> and the
        <a href="/legal/privacy/">privacy policy</a>. You can
        <a href="/legal/privacy/#your-data">export or delete your data</a> at any time.</p>
      </form>
    </div>
  </div>
</section>

<section class="section section--alt">
  <div class="wrap">
    ${disclaimerBox('legal')}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2 id="wall">The signature wall</h2>
    <p class="muted measure">Only signers who verified their email <em>and</em> chose to appear
    publicly are listed here. Everyone else is counted but not named.</p>
    <div class="wall" data-signature-wall>
      <p class="news-loading">Loading signatures&hellip;</p>
    </div>
    <div class="center"><button class="btn btn-ghost" type="button" data-wall-more hidden>Load more</button></div>
  </div>
</section>`;

  return {
    title: 'Sign the petition',
    description:
      'Sign the petition demanding the US government publish its 1950-1975 tick research record, ' +
      'fund independent research into persistent Lyme disease, fix diagnostic standards, and create ' +
      'a compensation pathway for the disabled.',
    path: '/petition/',
    ogImage: '/assets/og/petition.png',
    body,
    scripts: ['/assets/js/petition.js'],
  };
}

export { STATES, RELATIONSHIPS };
