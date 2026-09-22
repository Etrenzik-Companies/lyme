# Decisions

Judgment calls made while building this, and why — so they can be revisited on purpose
rather than by accident.

---

## Content and credibility

### The site does not claim the government created Lyme disease

**Decision.** The record page presents the laboratory-origin claim as an *allegation*, and
prints the evidence against it prominently rather than burying it.

**Why.** *Borrelia burgdorferi* DNA has been recovered from a 5,300-year-old Alpine mummy
and from ticks collected at Montauk Point in **1945** — nine years before Plum Island
opened and thirty years before the Connecticut cluster. Asserting the origin claim would be
falsifiable in one search, and the first journalist or congressional staffer who checked it
would discard everything else on the site along with it.

The narrower claim is documented and far stronger: the US Army ran declassified
insect-vector warfare trials (Big Itch 1954, Big Buzz 1955, May Day 1956), Rep. Chris Smith
got the House to order a federal review of tick weaponisation three times, and **the
findings have never been published**. "Publish the record" is an ask that can actually be
won.

### Three evidence tiers, styled differently

Every timeline entry is `documented`, `contested`, or `allegation`, with a visible chip, a
distinct marker colour *and* a distinct marker shape (circle / square / diamond), so the
tier does not depend on colour alone. Each entry carries at least one source link; the build
would happily render one without, so this is enforced by the editorial rule at the top of
`src/content/timeline.js` rather than by code. **If you add code enforcement later, make it
fail the build, not warn.**

### The counter-arguments are on the same page, near the top

The American Lyme Disease Foundation rebuttal and the Snopes fact-check are linked directly
from the record page. A reader who checks the work and finds it honest is worth more than a
hundred who take it on faith.

---

## The petition

### Double opt-in, non-negotiable

A signature is written with `verified = 0` and counts toward nothing public until the
emailed link is clicked. `/api/count` only ever counts `verified = 1`.

**Why.** A petition number that can be inflated by a shell script is worth nothing to a
congressional office and actively harmful to a law firm evaluating plaintiffs. Slower
growth with a defensible number beats a big number that collapses under one question.

Unverified rows are deleted after 30 days by the retention sweep.

### Duplicate signatures do not reveal themselves

Submitting an email that already signed returns exactly the same response as a new
signature. Otherwise the endpoint becomes an oracle: "is this person on the Lyme petition?"
is a question about someone's health, and this site should not answer it to strangers.

### Verification links stay valid after use

The `verify_token` is deliberately **not** cleared on use. People re-click confirmation
links and open them on a second device; clearing the token turns a harmless second click
into "invalid token" and makes a signer think they failed. The token's only power is to set
`verified = 1`, which is already done.

### Two separate consent checkboxes

"Show me on the public wall" and "contact me if counsel is engaged" are independent.
Bundling them would mean someone who wants to be counted but not named has to opt out of
being contactable, which is the opposite of what most people want.

### Emails encrypted, hashes for everything else

`email_enc` is AES-GCM; `email_hash` is a salted SHA-256 used as the unique key so
duplicates are detectable without decrypting anything. No public endpoint selects
`email_enc` at all — not filtered out, *not in the query* — so a future edit cannot leak one
by forgetting a filter. IP and user-agent are stored only as salted hashes and are nulled
after 12 months.

---

## Moderation and stories

### Nothing publishes automatically, ever

Stories land as `pending`. Only a human hitting `/api/admin/stories` behind Cloudflare
Access can approve one. There is no auto-approve path and no "trusted submitter" bypass.

### Oversharing is flagged, not blocked

Submissions are scanned for phone numbers, street addresses, SSN-shaped strings, emails,
named clinicians and drug dosages. Matches are surfaced to the moderator and warned about
once in the browser — but the person can still submit as written. It is their story. The
warning exists because people writing about the worst years of their life overshare, and a
moderator should see the risky parts highlighted rather than have to spot them.

Dosages are flagged because a story containing a protocol reads as medical advice, which
this site cannot become.

### Cloudflare Access instead of a login form

There is no password anywhere in this codebase. A hand-rolled admin login on a database of
sick people's contact details is not a risk worth taking for the convenience it buys. The
Access JWT is *also* verified server-side in `lib/access.js`, so a request that somehow
reaches the Function directly still fails.

### A crisis line in the footer of every story page

Chronic illness communities carry real suicide risk. 988 is one line of HTML.

### Seed stories are labelled as examples in their own text

The three seed stories say "EXAMPLE STORY" in the first line of the body, not just in a
database column. Publishing invented testimony that reads as real would poison the one
asset this project has.

---

## Social

### Human approval on every outbound post

The cron worker writes drafts with `status = 'pending'`. It publishes only drafts a person
has already set to `approved`. Unapproved drafts **expire after 48 hours rather than
posting** — a missed approval means silence, never an unreviewed post going out under this
project's name about sick people's lives.

The hard limits are written as a comment block at the top of both `lib/social.js` and
`worker/src/social.js` so the constraint travels with the code: no DMs, no auto-follow, no
scraping, no auto-reply, no contacting anyone who has not opted in.

### Stories are only quoted with a second, separate consent

`consent_publish` puts a story on the site. `consent_social` is what lets the worker quote
it. Consenting to one is not consenting to the other.

---

## Data and charts

### CDC CSVs are committed alongside the parsed JSON

So any change to the numbers is a readable diff in a pull request rather than an invisible
network fetch at build time. `npm run data` refreshes them.

### Three mandatory chart annotations

The COVID-19 reporting gap (2020–21), the 2022 case-definition change, and the ~476,000
claims-based estimate. The 2022 step is a **69% jump caused by changed surveillance
methods, not by disease risk** — plotting it without the annotation is the single easiest
way to get fact-checked, and it is drawn as a labelled divider directly on the chart rather
than a footnote.

### No dual-axis charts

Cases and incidence have different scales, so they get separate plots behind a toggle, not
two y-axes on one frame.

### Nine census regions folded into six series

Five largest regions keep their own hue in a fixed order; the four smallest become "Other
regions". Nine categorical colours cannot be told apart reliably, and colour follows the
region, never its rank.

### Charts render server-side as inline SVG

No Chart.js, no D3, no runtime data fetch for first paint. The tracker is fully readable
with JavaScript disabled; hover, the metric toggle and table sorting are enhancements on
top. The CI workflow greps `dist/index.html` for a rendered chart before deploying.

### A table view is not optional

Three of the categorical palette slots sit below 3:1 contrast on the light surface, which
obliges a non-colour fallback. It is also what journalists actually copy from.

---

## Infrastructure

### OG images generated locally and committed

X and Facebook do not render SVG for `og:image`, so they must be PNGs. Rasterising needs a
font stack, and the Cloudflare Pages build container has no guaranteed one. Generating them
on a developer machine and committing the output means CI never needs `@resvg/resvg-js` —
and a share image that silently renders as blank boxes is worse than one that is a day
stale. Cost: `npm run og` has to be re-run when headline numbers change. That is in the
README checklist.

### The story route explicitly falls through for reserved slugs

Pages Functions match **before** static assets, so `functions/stories/[slug].js` would
otherwise swallow the hand-written `/stories/share/` and `/stories/thanks/` pages. Those
names call `next()`.

### Email failures never lose a submission

Both `sign` and `story-submit` commit the row first, then attempt the email inside a
`try`. A mail provider outage must not throw away something a person spent an hour writing.
`/api/sign` returns `{ok: true, mailed: false}` so the failure is visible in logs.

### The news feed fails soft

If every source dies, `/api/news` returns an empty array with `degraded: true` and the
worker leaves the existing rows alone. The home page shows "the feed is updating", never a
500. GDELT times out regularly and is expected to.

### De-duplication is two-layer

A SHA-256 of the canonicalised URL (tracking parameters stripped, Google News redirect
unwrapped) **and** trigram similarity ≥ 0.85 on normalised headlines, checked against the
last 14 days. The wire services, Google News and GDELT all carry the same story under
slightly different titles.

### Relevance threshold of 10, with a penalty

An item whose *headline* never says "Lyme" or "Borrelia" loses 6 points. Without it, generic
tick-season coverage floods a feed that is supposed to be about one disease. Items below
threshold are stored as `low_confidence` rather than discarded, so the threshold can be
tuned against real data later.

---

## Things deliberately not built

- **Auto-posting without approval.** See above.
- **A donate button.** Taking money changes the disclosure obligations and the tone. The
  about page commits to disclosing funding *before* any is accepted.
- **Comments on stories.** An unmoderated comment section under a chronically ill person's
  account of their illness is a liability with no upside.
- **Analytics with cookies.** Cloudflare Web Analytics only, which is why there is no cookie
  banner and the privacy policy can say "no third-party trackers" without qualification.
- **A `mailto:` to congressional offices.** They use web forms; faking an address that
  bounces would waste people's effort and look incompetent.
