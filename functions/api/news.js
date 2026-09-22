/**
 * GET /api/news — the aggregated feed, written by the cron worker.
 *
 * Supports ?category, ?q, ?window (hours), ?limit, ?offset.
 * Low-confidence items are excluded unless explicitly requested, so a piece that merely
 * mentions ticks never lands in a Lyme disease feed.
 */
import { json, methodGuard, clamp, str } from '../../lib/http.js';
import { NEWS_CATEGORIES } from '../../lib/constants.js';

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET');
  if (bad) return bad;

  const url = new URL(request.url);
  const limit = clamp(url.searchParams.get('limit') || 25, 1, 50);
  const offset = clamp(url.searchParams.get('offset') || 0, 0, 100000);
  const category = str(url.searchParams.get('category') || '', 20);
  const q = str(url.searchParams.get('q') || '', 80);
  const windowHours = url.searchParams.get('window');

  const where = [`hidden = 0`, `confidence = 'normal'`];
  const binds = [];

  if (category && NEWS_CATEGORIES.includes(category)) {
    where.push(`category = ?`);
    binds.push(category);
  }
  if (q) {
    where.push(`(title LIKE ? OR summary LIKE ? OR source LIKE ?)`);
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  if (windowHours) {
    const hours = clamp(windowHours, 1, 24 * 30);
    where.push(`COALESCE(published_at, fetched_at) >= datetime('now', ?)`);
    binds.push(`-${hours} hours`);
  }

  const sql = `SELECT id, url, title, summary, source, category, published_at, fetched_at
                 FROM news_items
                WHERE ${where.join(' AND ')}
                ORDER BY COALESCE(published_at, fetched_at) DESC
                LIMIT ? OFFSET ?`;

  try {
    const { results } = await env.DB.prepare(sql).bind(...binds, limit, offset).all();
    const newest = await env.DB.prepare(
      `SELECT MAX(fetched_at) AS updated FROM news_items`
    ).first();

    return json(
      { items: results || [], updated_at: newest?.updated || null },
      200,
      { 'cache-control': 'public, max-age=300' }
    );
  } catch (err) {
    // An empty feed is a better failure than a 500 on the home page.
    console.error('[news]', err.message);
    return json({ items: [], updated_at: null, degraded: true }, 200);
  }
}
