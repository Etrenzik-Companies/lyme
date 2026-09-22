/**
 * About, legal and transactional pages.
 *
 * The legal text here is written to be honest rather than to be maximally protective.
 * Have a lawyer read it before launch — see README "Before you go live".
 */
import { esc, SITE } from '../layout.js';

export function about() {
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">About</p>
    <h1>What this project is, and what it is not</h1>
  </div>
</section>

<section class="section">
  <div class="wrap prose measure">
    <h2>What it is</h2>
    <p>An independent, volunteer-run site that does four things: tracks US Lyme disease case data
    from CDC's own published surveillance files, aggregates daily news from public sources,
    publishes a sourced timeline of the disease and the federal record around it, and collects
    verified signatures on a petition with four specific demands.</p>

    <h2>What it is not</h2>
    <ul>
      <li><strong>Not a government site.</strong> No affiliation with CDC, NIH, the Department of
      Defense or any agency. We reproduce CDC's published data because it is a US Government work
      in the public domain.</li>
      <li><strong>Not a medical resource.</strong> No protocols, no supplement advice, no
      diagnosis. If you are sick, see a licensed clinician.</li>
      <li><strong>Not a law firm.</strong> The petition is a petition. It is not litigation and
      signing it does not retain anyone as your attorney.</li>
      <li><strong>Not claiming the government invented Lyme disease.</strong> The bacterium is over
      five thousand years old. We are asking a narrower question, and we explain exactly why on the
      <a href="/history/">record page</a>.</li>
    </ul>

    <h2>How we handle claims</h2>
    <p>Every factual assertion on this site carries a source link. Claims are sorted into three
    tiers — documented, under investigation, and allegation — and they are styled differently so
    you can tell at a glance which one you are reading. We publish the strongest arguments
    <em>against</em> our own framing on the same page as the framing, because a reader who checks
    our work and finds it honest is worth a hundred who take it on faith.</p>

    <h2>Corrections</h2>
    <p>We will get things wrong. When we do, the correction is logged publicly on the
    <a href="/legal/sources/">sources and corrections</a> page with the date and what changed.
    Email <a href="mailto:${esc(SITE.url.replace('https://', 'contact@'))}">our contact address</a>
    with anything you can document.</p>

    <h2>Funding</h2>
    <p>Currently unfunded and volunteer-run. Hosting costs are paid personally. If that ever
    changes — a grant, a donation, an organizational sponsor — it will be disclosed on this page
    before the money is accepted.</p>

    <h2>Your data</h2>
    <p>We collect the minimum: a name fragment, a state, an email we never publish, and whatever
    you choose to write. Emails are stored encrypted and are never sold or shared. You can
    <a href="/legal/privacy/#your-data">export or delete everything we hold about you</a> at any
    time, and delete means delete.</p>
  </div>
</section>`;
  return {
    title: 'About',
    description: 'Who runs this project, how claims are sourced and rated, and how your data is handled.',
    path: '/about/',
    body,
  };
}

export function privacy() {
  const body = `
<section class="page-head"><div class="wrap"><p class="eyebrow">Legal</p><h1>Privacy policy</h1>
<p class="muted">Last updated ${new Date().toISOString().slice(0, 10)}</p></div></section>
<section class="section"><div class="wrap prose measure">

<h2>The short version</h2>
<p>We collect as little as we can, we never sell it, there are no third-party trackers on this
site, and you can delete everything we hold with two clicks.</p>

<h2>What we collect</h2>
<h3>If you sign the petition</h3>
<ul>
  <li>First name, last initial, state, your relationship to the issue, optionally years affected
  and a short statement.</li>
  <li>Your email address — stored <strong>encrypted</strong>, plus a salted one-way hash used to
  stop duplicate signatures. No public endpoint on this site can return an email address.</li>
  <li>A salted hash of your IP address and browser user-agent, kept for abuse investigation only.
  The raw values are never written to storage.</li>
</ul>
<h3>If you submit a story</h3>
<ul>
  <li>What you type, the display name you choose, optionally a state, a year and a photo.</li>
  <li>Your email, handled the same way as above.</li>
  <li>Uploaded images have embedded metadata (including GPS location) stripped before storage.</li>
</ul>
<h3>Everyone else</h3>
<p>Nothing that identifies you. We use Cloudflare Web Analytics, which is cookieless and does not
fingerprint visitors. There is no Google Analytics, no advertising pixel, no social SDK, and no
third-party JavaScript beyond Cloudflare's bot-protection widget on the two forms.</p>

<h2>Why there is no cookie banner</h2>
<p>Because we do not set tracking cookies. The only browser storage this site uses is a local
preference for light or dark mode, which never leaves your device.</p>

<h2>Who we share it with</h2>
<p>Nobody. We do not sell, rent, trade or disclose personal information. The only exception is a
valid legal order, and if we ever receive one we will notify the affected person unless we are
legally barred from doing so.</p>

<h2>How long we keep it</h2>
<p>Signatures are kept as long as the petition is active. Unverified signatures are deleted after
30 days. Rejected story submissions are deleted after 90 days. Abuse hashes are kept 12 months.</p>

<h2 id="your-data">Your rights — export and deletion</h2>
<p>Every confirmation email contains a personal management link. From it you can download
everything we hold about you as JSON, or delete it. Deletion removes the database row; it is not a
soft delete and it is not recoverable. If you have lost the link, email us from the address you
signed with and we will send a new one.</p>
<p>These rights are available to everyone, not only residents of California or the EU.</p>

<h2>Children</h2>
<p>This site is not directed at children under 13 and we do not knowingly collect their data. A
parent or guardian may submit a story about a child, and should not include the child's full name.</p>

<h2>Security</h2>
<p>Data is held in Cloudflare D1 and R2 in the United States. Encryption keys and hashing salts are
stored as platform secrets, never in the source repository. Administrative access is restricted by
Cloudflare Access with two-factor authentication.</p>

<h2>Changes</h2>
<p>Material changes will be announced on the site and dated here. Contact:
<a href="mailto:contact@example.org">contact@example.org</a>.</p>
</div></section>`;
  return { title: 'Privacy policy', description: 'What this site collects, how it is stored, and how to delete it.', path: '/legal/privacy/', body };
}

export function terms() {
  const body = `
<section class="page-head"><div class="wrap"><p class="eyebrow">Legal</p><h1>Terms of use</h1>
<p class="muted">Last updated ${new Date().toISOString().slice(0, 10)}</p></div></section>
<section class="section"><div class="wrap prose measure">
<h2>Using this site</h2>
<p>You may read, quote, link to and share anything here. Original content is licensed
<a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>; attribute it
to ${esc(SITE.name)} with a link. CDC data reproduced here is a US Government work in the public
domain. News headlines and links belong to their publishers.</p>

<h2>What you submit</h2>
<p>You keep ownership of your story. By submitting it with the publication box ticked, you grant us
a non-exclusive, royalty-free licence to publish it on this site and, if you ticked the second box,
to quote it on the project's social accounts. You can withdraw that permission at any time and we
will remove it.</p>
<p>You confirm that what you submit is your own account, that you have the right to share it, and
that it does not identify other people without their consent.</p>

<h2>Moderation</h2>
<p>We review every submission before publication and may decline or ask for edits. We will decline
content that identifies third parties, gives specific medical protocols, is abusive or harassing,
promotes a product or service, or that we cannot reasonably verify came from a real person. This
is editorial judgment, not a neutral platform, and we do not promise to publish anything.</p>

<h2>The petition</h2>
<p>Signing is a political expression of support. It is not a legal filing, it does not join you to
any lawsuit, and it does not create an attorney-client relationship with anyone. See the
<a href="/legal/disclaimer/">full disclaimer</a>.</p>

<h2>No warranty</h2>
<p>This site is provided as-is. We work hard on accuracy and we correct errors publicly, but we do
not warrant that everything here is complete or current. External links are provided for
verification and do not imply endorsement.</p>

<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, ${esc(SITE.name)} and its volunteers are not liable for
indirect or consequential damages arising from use of this site.</p>

<h2>Contact</h2>
<p><a href="mailto:contact@example.org">contact@example.org</a></p>
</div></section>`;
  return { title: 'Terms of use', description: 'Terms for using this site and submitting content.', path: '/legal/terms/', body };
}

export function disclaimer() {
  const body = `
<section class="page-head"><div class="wrap"><p class="eyebrow">Legal</p><h1>Disclaimers</h1></div></section>
<section class="section"><div class="wrap prose measure">

<h2>Not medical advice</h2>
<p>Nothing on this site diagnoses, treats, cures or prevents any condition. The patient stories
describe individual experiences that have not been medically verified and are not treatment
guidance. Do not delay seeking care, and do not change any treatment, because of something you read
here. Talk to a licensed clinician.</p>

<h2>Not legal advice</h2>
<p>The petition is a public petition and a registry of interested people. <strong>It is not a
lawsuit and it is not a class action.</strong> Signing does not make you a party to any legal
proceeding and does not create an attorney-client relationship with this project, its volunteers, or
any attorney.</p>
<p>Claims against the United States government face substantial and often decisive barriers,
including sovereign immunity, the limits and exceptions of the Federal Tort Claims Act, the
requirement to exhaust administrative remedies before filing suit, and strict deadlines that can bar
a claim before it is ever heard on the merits. Some potential claims are already time-barred. No
litigation can proceed unless licensed attorneys review individual claims and conclude there is a
viable case.</p>
<p>If you believe you have a legal claim, consult a licensed attorney in your jurisdiction now
rather than waiting on this petition. Deadlines run whether or not anyone is organizing.</p>

<h2>On the origin question</h2>
<p>This project does not assert that the United States government created Lyme disease.
<em>Borrelia burgdorferi</em> DNA has been recovered from a 5,300-year-old mummy and from ticks
collected on Long Island in 1945. Our <a href="/history/">record page</a> states this plainly and
links the leading rebuttals of the laboratory-origin claim.</p>
<p>What this project does assert is narrower and documented: the US Army ran declassified
insect-vector warfare trials between 1950 and 1975, Congress has repeatedly directed a federal
review of whether ticks were involved, and the complete findings have not been published. We are
asking for the record, not asserting what is in it.</p>

<h2>Data</h2>
<p>Case figures are reproduced from CDC's published surveillance files without alteration. Reported
cases are not the same as actual cases — CDC's own claims-based analysis estimates roughly ten times
the surveillance count. The 2022 revision to the surveillance case definition makes figures before
and after that year not directly comparable, and our charts label this.</p>

<h2>Not affiliated</h2>
<p>No affiliation with or endorsement by CDC, NIH, NIAID, the Department of Defense, the Government
Accountability Office, any member of Congress, or any patient organization referenced on this site.</p>
</div></section>`;
  return { title: 'Disclaimers', description: 'Medical, legal and data disclaimers for this project.', path: '/legal/disclaimer/', body };
}

export function sources() {
  const body = `
<section class="page-head"><div class="wrap"><p class="eyebrow">Legal</p><h1>Sources &amp; corrections</h1>
<p class="lede measure">Every number and claim on this site should be checkable. If something here
is wrong, tell us and we will log the fix publicly.</p></div></section>
<section class="section"><div class="wrap prose measure">

<h2>Primary data sources</h2>
<ul>
  <li><a href="https://www.cdc.gov/lyme/data-research/facts-stats/surveillance-data-1.html" rel="noopener">CDC Lyme disease surveillance data</a>
  — the case counts, incidence rates, regional and state tables behind the tracker. Refreshed from
  CDC's published CSV files; the raw files are committed to the repository alongside the parsed
  output so anyone can diff them.</li>
  <li><a href="https://www.cdc.gov/mmwr/volumes/73/wr/mm7306a1.htm" rel="noopener">MMWR 73(6): Surveillance after the revised case definition</a>
  — the basis for the 2022 annotation on every chart.</li>
  <li><a href="/data/cdc-lyme.json">Our parsed dataset (JSON)</a> — free to reuse, CC BY 4.0.</li>
</ul>

<h2>Timeline sources</h2>
<p>Each timeline entry on the <a href="/history/">record page</a> carries its own source list under
a "Sources" toggle. Every entry has at least one.</p>

<h2>How the news feed selects items</h2>
<p>Automated, every six hours, from public APIs and RSS feeds: PubMed E-utilities,
ClinicalTrials.gov, Congress.gov, the Federal Register, CDC, NIH/NIAID, patient organizations and
general news aggregators. Items are de-duplicated by canonical URL hash and by headline similarity,
then scored for relevance. We store headline, source, date, link and our own one-line summary — not
article text. Publishers who want their outlet excluded should email us.</p>

<h2>Corrections log</h2>
<p class="muted">No corrections logged yet. When there are, each entry will show the date, what was
wrong, what it says now, and who reported it.</p>

<h2>Report an error</h2>
<p>Email <a href="mailto:contact@example.org">contact@example.org</a>. Documented corrections are
made within 48 hours. If you can point at a primary source, we will take it seriously regardless of
whether it helps our argument.</p>
</div></section>`;
  return { title: 'Sources and corrections', description: 'Every data source behind this site, and the public corrections log.', path: '/legal/sources/', body };
}

/* --------------------------------------------------------- transactional */

export function verified() {
  const body = `
<section class="page-head center"><div class="wrap narrow">
  <div class="big-check" aria-hidden="true">&#10003;</div>
  <h1>Your signature is confirmed</h1>
  <p class="lede">You are now counted. Thank you — verified signatures are the only kind this
  project reports, which is exactly why they carry weight.</p>
  <div class="hero-actions center-actions">
    <a class="btn btn-primary" href="/spread/">Help us reach the next person</a>
    <a class="btn btn-ghost" href="/stories/share/">Share your story</a>
  </div>
  <p class="muted small">Keep the management link in your confirmation email — it is how you export
  or delete your data later.</p>
</div></section>`;
  return { title: 'Signature confirmed', description: 'Your petition signature has been verified.', path: '/petition/verified/', body };
}

export function checkEmail() {
  const body = `
<section class="page-head center"><div class="wrap narrow">
  <h1>Check your email</h1>
  <p class="lede">We sent you one link. Your signature is <strong>not counted</strong> until you
  click it — that is deliberate, and it is why this petition's number can be trusted.</p>
  <p class="muted">Nothing after a few minutes? Check spam, and make sure the address was right.
  You can safely submit the form again.</p>
  <p><a class="btn btn-ghost" href="/">Back to the tracker</a></p>
</div></section>`;
  return { title: 'Check your email', description: 'Confirm your petition signature.', path: '/petition/check-email/', body };
}

export function storyThanks() {
  const body = `
<section class="page-head center"><div class="wrap narrow">
  <div class="big-check" aria-hidden="true">&#10003;</div>
  <h1>We have your story</h1>
  <p class="lede">A person will read it before anything is published. That usually takes a few days.
  We will email you either way — including if we need to ask you to change something.</p>
  <p class="muted">You can ask us to remove your story at any time, before or after publication,
  by replying to that email.</p>
  <div class="hero-actions center-actions">
    <a class="btn btn-primary" href="/petition/">Sign the petition too</a>
    <a class="btn btn-ghost" href="/stories/">Read others</a>
  </div>
</div></section>`;
  return { title: 'Story received', description: 'Your story has been submitted for review.', path: '/stories/thanks/', body };
}

export function notFound() {
  const body = `
<section class="page-head center"><div class="wrap narrow">
  <h1>Page not found</h1>
  <p class="lede">That link is wrong or the page moved.</p>
  <div class="hero-actions center-actions">
    <a class="btn btn-primary" href="/">Go to the tracker</a>
    <a class="btn btn-ghost" href="/news/">Latest news</a>
  </div>
</div></section>`;
  return { title: 'Page not found', description: 'Page not found.', path: '/404.html', body };
}
