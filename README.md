# The Lyme Accountability Project

Case tracker, daily news engine, sourced federal record, petition, and a moderated patient
story archive. Cloudflare Pages + Functions + D1 + KV + R2, with a scheduled Worker.

Live at **https://lyme.etrenzik.com**

---

## What this is

Four things, in order of how much they matter:

1. **A case tracker** built from CDC's own published surveillance files (1996–2023), with
   the two annotations that keep it honest: the COVID-19 reporting gap, and the 2022
   case-definition change that inflated counts by ~69% without any change in real risk.
   The headline number is CDC's claims-based estimate of **~476,000 diagnosed and treated
   per year** against the **89,468** surveillance count.
2. **A petition** with double opt-in. A signature is not counted until the emailed link is
   clicked. This is the single most important decision in the codebase — see
   [DECISIONS.md](DECISIONS.md).
3. **A sourced record** of Lyme disease origins and the federal tick-research question,
   with every claim tiered as *documented*, *under investigation* or *allegation*, and the
   strongest counter-arguments printed on the same page.
4. **A news engine** that pulls from PubMed, ClinicalTrials.gov, the Federal Register,
   Congress.gov, CDC, NIAID, LymeDisease.org, Google News and GDELT every six hours.

---

## Quick start

```bash
npm install
npm run build
npx wrangler d1 execute lyme-db --local --file=./schema.sql
npx wrangler d1 execute lyme-db --local --file=./seeds.sql
npx wrangler pages dev
```

Then open http://localhost:8788.

Create a `.dev.vars` for local secrets (it is gitignored):

```
ADMIN_DEV_BYPASS=true
SITE_URL=http://localhost:8788
EMAIL_HASH_SALT=dev-salt-email
IP_HASH_SALT=dev-salt-ip
EMAIL_ENC_KEY=dev-key-email-encryption
```

`ADMIN_DEV_BYPASS` skips Cloudflare Access so `/admin/` works locally. It is read only from
`.dev.vars` — never set it in production.

---

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Renders `dist/` — 17 pages, charts included, ~600 KB |
| `npm run dev` | Build + `wrangler pages dev` |
| `npm run data` | Re-downloads the CDC CSVs and regenerates `data/cdc-lyme.json` |
| `npm run og` | Regenerates the social share images (run locally, commit the PNGs) |
| `npm run db:init` | Applies `schema.sql` to the **remote** D1 database |
| `npm run deploy` | Build + `wrangler pages deploy dist` |
| `npm run worker:deploy` | Deploys the cron worker |

---

## First-time setup

Everything below needs `wrangler login` (or `CLOUDFLARE_API_TOKEN` in your environment).

### 1. Create the resources

```bash
npx wrangler d1 create lyme-db
npx wrangler kv namespace create KV
npx wrangler r2 bucket create lyme-story-media
```

Paste the returned IDs into **both** `wrangler.toml` and `worker/wrangler.toml`
(`database_id` and the KV `id`). They must match — the Pages Functions and the cron worker
share one database.

### 2. Create the schema

```bash
npm run db:init
npx wrangler d1 execute lyme-db --remote --file=./seeds.sql   # optional example stories
```

### 3. Create the Pages project and attach the domain

```bash
npx wrangler pages project create lyme --production-branch=main
npm run deploy
npx wrangler pages domain add lyme lyme.etrenzik.com
```

The last command adds the custom domain. Because `etrenzik.com` is already on Cloudflare,
the CNAME is created for you — it just needs a minute to go active.

### 4. Set the secrets

```bash
npx wrangler pages secret put EMAIL_HASH_SALT --project-name=lyme
npx wrangler pages secret put IP_HASH_SALT    --project-name=lyme
npx wrangler pages secret put EMAIL_ENC_KEY   --project-name=lyme
npx wrangler pages secret put TURNSTILE_SECRET --project-name=lyme
```

Generate each salt/key with something like
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

> **Do not rotate `EMAIL_HASH_SALT` or `EMAIL_ENC_KEY` after launch.** Rotating the hash
> salt orphans every duplicate check; rotating the encryption key makes existing stored
> emails permanently unreadable, which breaks the export/delete promise in the privacy
> policy.

### 5. Turnstile

Create a widget at **Cloudflare dashboard → Turnstile**, hostname `lyme.etrenzik.com`.
Put the **site key** in `wrangler.toml` under `[vars] TURNSTILE_SITE_KEY`, and the **secret
key** in the Pages secret above. Until you do, the build uses Cloudflare's always-pass test
key and the server-side check is skipped — fine for development, not for launch.

### 6. Cloudflare Access for `/admin/`

Zero Trust → Access → Applications → Add a self-hosted application:

- Domain: `lyme.etrenzik.com`, path `admin`
- Policy: allow your own email address only, with a second factor

Then set these Pages vars so the API verifies the Access JWT server-side as well:

```bash
npx wrangler pages secret put ACCESS_TEAM_DOMAIN --project-name=lyme   # yourteam.cloudflareaccess.com
npx wrangler pages secret put ACCESS_AUD --project-name=lyme           # the app's Audience tag
```

Access in front of the page is the lock. The JWT check in `lib/access.js` is the second
lock, in case a request ever reaches the Function directly.

### 7. Email

Add the MailChannels DNS records for the sending domain (SPF plus the domain-lockdown TXT
record), then set `MAIL_FROM`. Without this, signatures still record but confirmation
emails do not arrive — and an unconfirmed signature never counts, so **email delivery is a
launch blocker, not a nice-to-have.**

### 8. The cron worker

```bash
npm run worker:deploy
npx wrangler secret put RUN_KEY --config worker/wrangler.toml
```

Optional: `CONGRESS_API_KEY` (free at api.data.gov) enables the Congress.gov source; it is
skipped silently without one. Social credentials are in [SOCIAL-SETUP.md](SOCIAL-SETUP.md).

Trigger a run by hand while testing:

```bash
curl "https://lyme-cron.<your-subdomain>.workers.dev/__run?job=news&key=$RUN_KEY"
```

---

## CI

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. It needs two
repository secrets:

- `CLOUDFLARE_API_TOKEN` — permissions: *Cloudflare Pages: Edit*, *D1: Edit*,
  *Workers KV Storage: Edit*, *Workers R2 Storage: Edit*
- `CLOUDFLARE_ACCOUNT_ID`

and optionally a repository **variable** `TURNSTILE_SITE_KEY`.

The workflow asserts that `dist/index.html` actually contains a rendered chart before
deploying, so a broken data pipeline fails the build instead of shipping an empty page.

---

## Refreshing the case data

CDC publishes the prior year around February and puts the year in both the path and the
filename. When 2024 data lands:

1. Bump `DATA_RELEASE` and `DATA_YEAR` at the top of `scripts/refresh-cdc-data.mjs`.
2. `npm run data` — it re-downloads, re-parses and reports the new headline figures.
3. `npm run og` — regenerates the share images with the new numbers.
4. Update `HEADLINE` in `lib/constants.js`, which the social drafts read.
5. `npm run build`, eyeball the tracker, commit.

The raw CSVs are committed alongside the parsed JSON so any change is a readable diff.

---

## Project layout

```
src/          page templates + the SVG chart engine (build time)
static/       CSS, client JS, favicon, generated OG images -> copied into dist/
functions/    Cloudflare Pages Functions (the API, story pages, RSS, media)
lib/          shared modules: crypto, http, email, access, social, image
worker/       the scheduled worker: news aggregation, social drafting, retention
scripts/      build, CDC data refresh, OG image generation
data/         raw CDC CSVs + the parsed dataset the tracker reads
schema.sql    D1 schema     seeds.sql  clearly-labelled example stories
```

---

## Before you go live

- [ ] **Have a lawyer read `/legal/` and the petition page.** The disclaimers are written to
      be honest about sovereign immunity, the FTCA and filing deadlines, but they are not a
      substitute for counsel — and this site asks sick people for their contact details.
- [ ] Replace `contact@example.org` throughout (`src/pages/static-pages.js`, `wrangler.toml`).
- [ ] Set every secret in §4; confirm `TURNSTILE_SECRET` is live, not the test key.
- [ ] Send yourself a real signature and confirm the email arrives and the link works.
- [ ] Delete the seed stories once real ones land:
      `wrangler d1 execute lyme-db --remote --command "DELETE FROM stories WHERE is_seed = 1"`
- [ ] Fill in the social handles in `static/assets/js/spread.js`.
- [ ] Decide whether the corrections log on `/legal/sources/` gets a real owner. A
      corrections policy nobody runs is worse than not claiming one.

## Known limitations

- **Per-story OG images** fall back to the generic stories card. Generating one per story
  needs a rasterizer in the Worker (satori + resvg-wasm); the static cards are generated at
  build time instead.
- **GDELT** is the flakiest news source and times out regularly. It fails soft — the run
  continues with the other eight sources.
- **The ZIP-to-state lookup** in `/spread/` uses ZIP prefixes, which is accurate to the
  state but not to the congressional district. That is why it links to the official House
  lookup rather than guessing a representative.
- **Congressional offices take web-form submissions, not email**, so the "email your
  representative" tool gives you the letter and the official links. It deliberately does
  not fake a `mailto:` to an address that would bounce.

## Licence

Content CC BY 4.0. Code MIT. CDC data is a US Government work in the public domain.
