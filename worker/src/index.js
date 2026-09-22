/**
 * Scheduled worker: news aggregation, social drafting, and housekeeping.
 *
 * Cron triggers (see wrangler.toml):
 *   0 star/6 * * *   news refresh, every six hours
 *   0 13,21 * * *    social drafting, twice a day
 *   30 4 * * *       retention sweep, nightly
 *
 * A manual run is available at GET /__run?job=news&key=… for debugging, gated by a
 * secret so it is not an open trigger.
 */
import { collect, similarity, SCORE_THRESHOLD } from './news-sources.js';
import { runSocial } from './social.js';
import { sha256 } from '../../lib/crypto.js';

/* ------------------------------------------------------------------ news */

async function runNews(env) {
  const { items, failures } = await collect(env);
  const report = { seen: items.length, inserted: 0, duplicates: 0, lowConfidence: 0, failures };

  if (!items.length) {
    console.warn('[news] every source returned nothing; leaving the existing feed in place');
    return report;
  }

  // Recent titles, so a story that arrived yesterday under a different headline is not
  // inserted again today.
  const { results: recent } = await env.DB.prepare(
    `SELECT title_norm FROM news_items WHERE fetched_at >= datetime('now', '-14 days')`
  ).all();
  const recentTitles = (recent || []).map((r) => r.title_norm);

  for (const item of items) {
    const urlHash = await sha256(item.url);

    const exists = await env.DB.prepare(`SELECT id FROM news_items WHERE url_hash = ?`)
      .bind(urlHash)
      .first();
    if (exists) { report.duplicates++; continue; }

    if (recentTitles.some((t) => similarity(t, item.titleNorm) >= 0.85)) {
      report.duplicates++;
      continue;
    }

    const confidence = item.score >= SCORE_THRESHOLD ? 'normal' : 'low';
    if (confidence === 'low') report.lowConfidence++;

    try {
      await env.DB.prepare(
        `INSERT INTO news_items
           (url_hash, url, title, title_norm, summary, source, source_kind, category,
            published_at, score, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          urlHash,
          item.url,
          item.title,
          item.titleNorm,
          item.summary || null,
          item.source,
          item.sourceKind,
          item.category,
          item.publishedAt,
          item.score,
          confidence
        )
        .run();
      recentTitles.push(item.titleNorm);
      report.inserted++;
    } catch (err) {
      if (!String(err.message).includes('UNIQUE')) {
        console.error('[news] insert failed:', err.message);
      }
      report.duplicates++;
    }
  }

  return report;
}

/* ----------------------------------------------------------- housekeeping */

/**
 * Retention, as promised in the privacy policy. If these windows change, change the
 * privacy policy in the same commit.
 */
async function runRetention(env) {
  const report = {};

  const unverified = await env.DB.prepare(
    `DELETE FROM signatures WHERE verified = 0 AND created_at < datetime('now', '-30 days')`
  ).run();
  report.unverifiedSignaturesDeleted = unverified.meta.changes || 0;

  const rejected = await env.DB.prepare(
    `DELETE FROM stories WHERE status = 'rejected' AND created_at < datetime('now', '-90 days')`
  ).run();
  report.rejectedStoriesDeleted = rejected.meta.changes || 0;

  const news = await env.DB.prepare(
    `DELETE FROM news_items WHERE fetched_at < datetime('now', '-180 days')`
  ).run();
  report.oldNewsDeleted = news.meta.changes || 0;

  const social = await env.DB.prepare(
    `DELETE FROM social_queue
      WHERE status IN ('expired', 'rejected') AND created_at < datetime('now', '-30 days')`
  ).run();
  report.oldDraftsDeleted = social.meta.changes || 0;

  // Abuse hashes stop being useful long before they stop being personal data.
  await env.DB.prepare(
    `UPDATE signatures SET ip_hash = NULL, ua_hash = NULL
      WHERE created_at < datetime('now', '-12 months') AND ip_hash IS NOT NULL`
  ).run();
  await env.DB.prepare(
    `UPDATE stories SET ip_hash = NULL, ua_hash = NULL
      WHERE created_at < datetime('now', '-12 months') AND ip_hash IS NOT NULL`
  ).run();

  return report;
}

/* --------------------------------------------------------------- dispatch */

async function runJob(env, job) {
  const started = Date.now();
  let report;

  if (job === 'news') report = await runNews(env);
  else if (job === 'social') report = await runSocial(env);
  else if (job === 'retention') report = await runRetention(env);
  else throw new Error(`unknown job: ${job}`);

  console.log(`[${job}] ${Date.now() - started}ms ${JSON.stringify(report)}`);
  return report;
}

export default {
  async scheduled(event, env, ctx) {
    const job =
      event.cron === '0 13,21 * * *' ? 'social' :
      event.cron === '30 4 * * *' ? 'retention' :
      'news';
    ctx.waitUntil(runJob(env, job).catch((err) => console.error(`[${job}] failed:`, err.message)));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/__run') {
      // Manual trigger for debugging. Without a matching secret this is a 404, not a
      // 403 — an unauthenticated caller should not learn the endpoint exists.
      if (!env.RUN_KEY || url.searchParams.get('key') !== env.RUN_KEY) {
        return new Response('Not found', { status: 404 });
      }
      try {
        const report = await runJob(env, url.searchParams.get('job') || 'news');
        return Response.json({ ok: true, report });
      } catch (err) {
        return Response.json({ ok: false, error: err.message }, { status: 500 });
      }
    }

    if (url.pathname === '/__health') {
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS n, MAX(fetched_at) AS latest FROM news_items`
      ).first();
      return Response.json({ ok: true, news_items: row?.n ?? 0, latest: row?.latest ?? null });
    }

    return new Response('This worker only runs on a schedule.', { status: 404 });
  },
};
