# Social setup

How to connect the project's X and Facebook accounts so approved posts can go out.

> **Read this first.** The worker drafts posts. A human approves each one in `/admin/`
> before anything reaches a platform, and unapproved drafts expire after 48 hours rather
> than posting. The hard limits are in the comment block at the top of `lib/social.js` —
> no DMs, no auto-follow, no scraping, no auto-replies, no contacting anyone who has not
> opted in. Those are not stylistic preferences: automated outreach gets accounts banned,
> and a petition about sick people asking to be heard cannot afford to look like a bot farm.

---

## 1. Create the accounts

Create them as **project accounts**, not on a personal profile. Use a shared address the
project controls, and turn on two-factor authentication on both before connecting anything.

Put the final handles into `static/assets/js/spread.js`:

```js
const HANDLES = {
  x: 'https://x.com/yourhandle',
  facebook: 'https://facebook.com/yourpage',
};
```

Until they are filled in, the follow links on `/spread/` render as "coming soon" rather
than as dead links.

---

## 2. X (Twitter)

### Create the app

1. https://developer.x.com → sign in as the project account → **Developer Portal**
2. Create a Project, then an App inside it.
3. **User authentication settings**:
   - App permissions: **Read and write**
   - Type of App: **Web App, Automated App or Bot**
   - Callback URI: `https://knowlyme.com/oauth/x/callback`
   - Website URL: `https://knowlyme.com`
4. Save the **OAuth 2.0 Client ID** and **Client Secret**.

### Scopes

`tweet.write`, `users.read`, `tweet.read`, `offline.access`

`offline.access` is what issues the refresh token. Without it you get a two-hour access
token and the worker stops posting after lunch.

### Get the first refresh token

X requires a one-time interactive authorisation with PKCE. Run this locally, once:

```bash
node scripts/x-authorize.mjs
```

It prints a URL, you approve it while signed in as the project account, and it prints the
refresh token.

### Store the credentials

```bash
npx wrangler secret put X_CLIENT_ID     --config worker/wrangler.toml
npx wrangler secret put X_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put X_REFRESH_TOKEN --config worker/wrangler.toml
```

Also set them on the Pages project, because approving a draft in `/admin/` posts it
immediately from a Function:

```bash
npx wrangler pages secret put X_CLIENT_ID     --project-name=lyme
npx wrangler pages secret put X_CLIENT_SECRET --project-name=lyme
npx wrangler pages secret put X_REFRESH_TOKEN --project-name=lyme
```

### How token rotation works

X issues a **new refresh token on every exchange and invalidates the old one**. The code
writes the rotated token into KV under `X_REFRESH_TOKEN_KV_KEY` (default `x_refresh_token`)
and prefers the KV value over the secret on subsequent runs.

Consequences worth knowing before something breaks at 2am:

- The `X_REFRESH_TOKEN` secret is only a **seed**. After the first successful run, KV holds
  the live token.
- If KV is cleared, re-seed by setting `X_REFRESH_TOKEN` again and re-running.
- Do not run two workers against the same X app concurrently — they will rotate each
  other's tokens and both will start failing.

### Rate limits

The free tier allows a small number of posts per day. The worker drafts at most one item
per run (twice daily, two platforms). On a 429 it backs off and re-queues rather than
retrying in a loop; the draft stays `approved` and goes out on the next run.

---

## 3. Facebook

### Create the app

1. https://developers.facebook.com → **My Apps** → **Create App** → type **Business**
2. Add the **Facebook Login** and **Pages API** products.
3. Connect the Page you created for the project.

### Permissions

`pages_manage_posts`, `pages_read_engagement`, `pages_show_list`

Posting to a Page you own is a standard use; an App Review submission is required before
the token works outside development mode. Budget a few days for that.

### Get a long-lived Page token

1. **Graph API Explorer** → select your app → *Get User Access Token* with the scopes above.
2. Exchange it for a long-lived user token:

   ```
   GET https://graph.facebook.com/v21.0/oauth/access_token
       ?grant_type=fb_exchange_token
       &client_id=<APP_ID>
       &client_secret=<APP_SECRET>
       &fb_exchange_token=<SHORT_LIVED_USER_TOKEN>
   ```

3. Get the Page token, which does **not** expire when derived from a long-lived user token:

   ```
   GET https://graph.facebook.com/v21.0/me/accounts?access_token=<LONG_LIVED_USER_TOKEN>
   ```

   Take `data[].access_token` for your Page, and `data[].id` as the Page ID.

### Store them

```bash
npx wrangler secret put FB_PAGE_ID    --config worker/wrangler.toml
npx wrangler secret put FB_PAGE_TOKEN --config worker/wrangler.toml
npx wrangler pages secret put FB_PAGE_ID    --project-name=lyme
npx wrangler pages secret put FB_PAGE_TOKEN --project-name=lyme
```

### Token expiry in practice

Page tokens derived from a long-lived user token are advertised as non-expiring, but they
are invalidated when the password changes, the app's permissions change, or Facebook
decides to. **Check `/admin/` → Social queue monthly.** A failed post shows there with the
platform's error message; it does not silently disappear.

---

## 4. Verify the pipeline

```bash
# 1. Force a drafting run
curl "https://lyme-cron.<subdomain>.workers.dev/__run?job=social&key=$RUN_KEY"

# 2. Confirm drafts exist and are pending — NOT posted
npx wrangler d1 execute lyme-db --remote \
  --command "SELECT id, platform, kind, status, expires_at FROM social_queue ORDER BY id DESC LIMIT 6"
```

Then open `/admin/` → **Social queue**, edit the text if needed, and approve one. It should
post immediately and flip to `posted` with an `external_id`.

**The test that actually matters:** queue a draft and *do not* approve it. After 48 hours it
must read `expired`, not `posted`. If it posted, stop and fix that before anything else.

---

## 5. What the worker drafts

In priority order, one per run:

1. **A signature milestone**, when one has just been crossed (1k / 5k / 10k / 25k / 50k / 100k)
2. **A newly approved story** — only if the author ticked the *separate* social-sharing
   consent box, quoted to 150 characters with attribution
3. **The day's top-scored news item**
4. **A rotating statistic** from `HEADLINE` in `lib/constants.js`, if none of the above apply

Each is queued for both platforms and trimmed to that platform's limit on a word boundary.
X's 280-character limit counts every URL as 23 characters, which the length check accounts
for.

A human can also write a custom post from `/admin/` → **Write a custom post**. It still
lands as `pending` and still needs approving — one person writing and the same person
approving is two deliberate actions, and the audit log records both.
