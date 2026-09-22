/**
 * GET /api/stories — approved stories only.
 *
 * The status filter is hardcoded, not taken from the query string. A pending story must
 * not be reachable by guessing a parameter.
 */
import { json, methodGuard, clamp, str } from '../../lib/http.js';

const EXCERPT = 180;

export async function onRequest({ request, env }) {
  const bad = methodGuard(request, 'GET');
  if (bad) return bad;

  const url = new URL(request.url);
  const limit = clamp(url.searchParams.get('limit') || 12, 1, 30);
  const offset = clamp(url.searchParams.get('offset') || 0, 0, 100000);
  const state = str(url.searchParams.get('state') || '', 60);
  const q = str(url.searchParams.get('q') || '', 80);

  const where = [`status = 'approved'`];
  const binds = [];

  if (state) { where.push(`state = ?`); binds.push(state); }
  if (q) {
    where.push(`(title LIKE ? OR body LIKE ?)`);
    binds.push(`%${q}%`, `%${q}%`);
  }

  const { results } = await env.DB.prepare(
    `SELECT slug, display_name, state, onset_year, title, body, approved_at
       FROM stories
      WHERE ${where.join(' AND ')}
      ORDER BY approved_at DESC
      LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  return json(
    {
      stories: (results || []).map((s) => ({
        slug: s.slug,
        display_name: s.display_name,
        state: s.state,
        onset_year: s.onset_year,
        title: s.title,
        excerpt: s.body.slice(0, EXCERPT).trim(),
        approved_at: s.approved_at,
      })),
    },
    200,
    { 'cache-control': 'public, max-age=300' }
  );
}
