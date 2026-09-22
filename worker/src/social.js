/* ===========================================================================
   SOCIAL DRAFTING — HARD LIMITS. READ BEFORE CHANGING ANYTHING IN THIS FILE.

   This worker may ONLY:
     - write DRAFT posts into social_queue with status = 'pending',
     - publish drafts that a human has already set to status = 'approved',
     - target social accounts THIS PROJECT OWNS, through official APIs.

   This worker must NEVER:
     - publish anything that has not been approved by a person,
     - send direct messages, auto-follow, auto-reply, or scrape follower lists,
     - contact anyone who has not opted in,
     - quote a patient story whose author did not tick the social-sharing consent box.

   Unapproved drafts EXPIRE. They do not eventually post. That is deliberate: a missed
   approval should mean silence, never an unreviewed post going out under this project's
   name about sick people's lives.
   =========================================================================== */

import { publish, trim, limitFor } from '../../lib/social.js';
import { MILESTONES, SOCIAL_DRAFT_TTL_HOURS, HEADLINE } from '../../lib/constants.js';

const PLATFORMS = ['x', 'facebook'];

const fmt = (n) => Number(n).toLocaleString('en-US');

/* ------------------------------------------------------------- generators */

async function newsDraft(env, site) {
  const item = await env.DB.prepare(
    `SELECT id, title, url, source, category
       FROM news_items
      WHERE hidden = 0
        AND confidence = 'normal'
        AND fetched_at >= datetime('now', '-24 hours')
        AND id NOT IN (SELECT COALESCE(ref_id, 0) FROM social_queue WHERE kind = 'news')
      ORDER BY score DESC
      LIMIT 1`
  ).first();
  if (!item) return null;

  return {
    kind: 'news',
    refId: item.id,
    link: item.url,
    text: `${item.title}\n\nvia ${item.source}`,
  };
}

async function milestoneDraft(env, site) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM signatures WHERE verified = 1`
  ).first();
  const verified = row?.n ?? 0;

  const reached = await env.DB.prepare(
    `SELECT value FROM counters WHERE key = 'milestone_reached'`
  ).first();
  const last = reached?.value ?? 0;

  const crossed = [...MILESTONES].reverse().find((m) => verified >= m && m > last);
  if (!crossed) return null;

  await env.DB.prepare(
    `UPDATE counters SET value = ?, updated_at = datetime('now') WHERE key = 'milestone_reached'`
  ).bind(crossed).run();

  return {
    kind: 'milestone',
    refId: null,
    link: `${site}/petition/`,
    text:
      `${fmt(crossed)} verified signatures.\n\n` +
      `Every one is a real, confirmed person asking the federal government to publish its ` +
      `1950–1975 tick research record and fund the science. Add your name.`,
  };
}

async function storyDraft(env, site) {
  const story = await env.DB.prepare(
    `SELECT id, slug, title, body, display_name, state
       FROM stories
      WHERE status = 'approved'
        AND consent_social = 1
        AND id NOT IN (SELECT COALESCE(ref_id, 0) FROM social_queue WHERE kind = 'story')
      ORDER BY approved_at DESC
      LIMIT 1`
  ).first();
  if (!story) return null;

  // Quote the opening of the story, never the whole thing, and always attribute.
  const quote = trim(story.body.replace(/\s+/g, ' ').trim(), 150);
  return {
    kind: 'story',
    refId: story.id,
    link: `${site}/stories/${story.slug}/`,
    text: `"${quote}"\n\n— ${story.display_name}${story.state ? `, ${story.state}` : ''}`,
  };
}

function statDraft(site) {
  const options = [
    `CDC counted ${fmt(HEADLINE.latestCases)} Lyme disease cases in ${HEADLINE.latestYear}.\n\n` +
      `CDC's own insurance-claims analysis puts the real number near ${fmt(HEADLINE.estimatedAnnual)} ` +
      `Americans diagnosed and treated every year. We are not being counted.`,
    `Reported Lyme disease cases in the US: ${fmt(HEADLINE.firstCases)} in ${HEADLINE.firstYear}. ` +
      `${fmt(HEADLINE.latestCases)} in ${HEADLINE.latestYear}.\n\n` +
      `There is still no human vaccine on the market and the standard test misses early infection.`,
    `Between 1950 and 1975 the US Army ran declassified field trials using insects as biological ` +
      `weapon vectors.\n\nCongress has three times ordered a review of whether ticks were among ` +
      `them. The findings have never been published.`,
  ];
  return {
    kind: 'stat',
    refId: null,
    link: `${site}/`,
    text: options[Math.floor(Date.now() / 43200000) % options.length],
  };
}

/* ----------------------------------------------------------------- queue */

async function enqueue(env, draft) {
  for (const platform of PLATFORMS) {
    const body = trim(draft.text, limitFor(platform) - (draft.link ? 25 : 0));
    await env.DB.prepare(
      `INSERT INTO social_queue (platform, kind, body, link, ref_id, status, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now', ?))`
    )
      .bind(platform, draft.kind, body, draft.link || null, draft.refId, `+${SOCIAL_DRAFT_TTL_HOURS} hours`)
      .run();
  }
}

/* ---------------------------------------------------------------- runner */

export async function runSocial(env) {
  const site = env.SITE_URL || 'https://knowlyme.com';
  const report = { drafted: 0, posted: 0, expired: 0, failed: 0 };

  // 1. Expire anything a human did not get to in time. Silence beats an unreviewed post.
  const expired = await env.DB.prepare(
    `UPDATE social_queue SET status = 'expired'
      WHERE status = 'pending' AND expires_at < datetime('now')`
  ).run();
  report.expired = expired.meta.changes || 0;

  // 2. Publish drafts a human already approved but that could not be sent at the time
  //    (rate limits, a transient platform error).
  const { results: approved } = await env.DB.prepare(
    `SELECT id, platform, kind, body, link, status, attempts
       FROM social_queue
      WHERE status = 'approved' AND attempts < 5
      ORDER BY approved_at ASC
      LIMIT 5`
  ).all();

  for (const draft of approved || []) {
    try {
      const externalId = await publish(env, draft);
      await env.DB.prepare(
        `UPDATE social_queue
            SET status = 'posted', posted_at = datetime('now'), external_id = ?, error = NULL
          WHERE id = ?`
      ).bind(externalId, draft.id).run();
      report.posted++;
    } catch (err) {
      const terminal = !err.retryable || draft.attempts >= 4;
      await env.DB.prepare(
        `UPDATE social_queue SET status = ?, error = ?, attempts = attempts + 1 WHERE id = ?`
      )
        .bind(terminal ? 'failed' : 'approved', String(err.message).slice(0, 500), draft.id)
        .run();
      report.failed++;
      if (err.retryable) break;            // back off rather than hammering the API
    }
  }

  // 3. Draft new material for a human to review. Pending drafts never auto-post.
  const pending = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM social_queue WHERE status = 'pending'`
  ).first();

  if ((pending?.n ?? 0) < 6) {
    const candidates = [
      await milestoneDraft(env, site),     // a crossed milestone is always worth saying
      await storyDraft(env, site),
      await newsDraft(env, site),
    ].filter(Boolean);

    const draft = candidates[0] || statDraft(site);
    await enqueue(env, draft);
    report.drafted = PLATFORMS.length;
  }

  return report;
}
